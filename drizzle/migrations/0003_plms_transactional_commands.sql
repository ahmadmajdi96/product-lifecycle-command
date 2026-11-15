CREATE FUNCTION public.plm_content_hash(_payload jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public,extensions AS $$ SELECT encode(extensions.digest(convert_to(_payload::text,'UTF8'),'sha256'),'hex'); $$;
CREATE FUNCTION public.plm_validate_payload(_kind text,_payload jsonb,_org uuid,_site uuid,_item uuid DEFAULT NULL,_strict boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE findings jsonb:='[]'; line jsonb; op jsonb; ref public.plm_revisions; ent public.plm_entities; unit text; seen text[]:='{}'; previous text; path text[]; rid uuid; req text; expected integer:=0;
BEGIN
 IF jsonb_typeof(_payload)<>'object' THEN RAISE EXCEPTION 'Payload must be an object'; END IF;
 IF octet_length(_payload::text)>262144 THEN RAISE EXCEPTION 'Definition exceeds supported size'; END IF;
 IF _kind='ITEM' THEN
  IF _payload->>'classification' NOT IN ('RAW','WIP','FG','PKG','TOOL','CONSUMABLE') OR _payload->>'classification' IS NULL THEN RAISE EXCEPTION 'Select a supported classification'; END IF;
  IF _payload->>'makeBuy' NOT IN ('MAKE','BUY') OR _payload->>'makeBuy' IS NULL THEN RAISE EXCEPTION 'Choose make or buy'; END IF;
  IF _payload->>'tracking' NOT IN ('NONE','LOT','SERIAL','CONTAINER') OR _payload->>'tracking' IS NULL THEN RAISE EXCEPTION 'Choose tracking policy'; END IF;
  IF _payload->>'baseUnit' NOT IN ('EA','KG','G','L','ML','M','MM','MIN','SEC') OR _payload->>'baseUnit' IS NULL THEN RAISE EXCEPTION 'Unsupported base unit'; END IF;
  IF _payload ? 'ownerId' AND NOT EXISTS(SELECT 1 FROM public.plm_memberships WHERE organization_id=_org AND user_id=(_payload->>'ownerId')::uuid AND active) THEN RAISE EXCEPTION 'Owner must belong to this organization'; END IF;
  IF coalesce(_payload->>'shelfLifeDays','')<>'' AND ((_payload->>'shelfLifeDays')!~'^[0-9]+$' OR (_payload->>'shelfLifeDays')::numeric<=0) THEN RAISE EXCEPTION 'Shelf life must be positive days'; END IF;
 ELSIF _kind IN ('BOM','ROUTING') THEN
  SELECT * INTO ref FROM public.plm_revisions WHERE id=_item AND organization_id=_org AND (site_id IS NULL OR site_id IS NOT DISTINCT FROM _site);
  IF NOT FOUND OR (SELECT kind FROM public.plm_entities WHERE id=ref.entity_id)<>'ITEM' THEN RAISE EXCEPTION 'Select an item revision in the same permitted scope'; END IF;
  IF _kind='BOM' THEN
   IF _payload->>'outputQuantity' IS NULL OR (_payload->>'outputQuantity')!~'^[0-9]+(\.[0-9]{1,9})?$' OR (_payload->>'outputQuantity')::numeric<=0 THEN RAISE EXCEPTION 'Positive decimal output basis required'; END IF;
   IF _payload->>'outputUnit' NOT IN ('EA','KG','G','L','ML','M','MM') OR _payload->>'outputUnit' IS NULL THEN RAISE EXCEPTION 'Supported output unit required'; END IF;
   IF _payload->>'outputUnit' IS DISTINCT FROM ref.payload->>'baseUnit' AND NOT EXISTS(SELECT 1 FROM public.plm_unit_conversions WHERE organization_id=_org AND item_entity_id=ref.entity_id AND from_unit=_payload->>'outputUnit' AND to_unit=ref.payload->>'baseUnit') THEN RAISE EXCEPTION 'Output unit needs an approved item conversion'; END IF;
   IF jsonb_typeof(_payload->'lines') IS DISTINCT FROM 'array' OR jsonb_array_length(_payload->'lines')>500 THEN RAISE EXCEPTION 'BOM lines must be a bounded array'; END IF;
   FOR line IN SELECT value FROM jsonb_array_elements(_payload->'lines') LOOP
    IF coalesce(line->>'id','')='' OR line->>'id'=ANY(seen) THEN RAISE EXCEPTION 'BOM line IDs must be stable and unique'; END IF; seen:=array_append(seen,line->>'id');
    IF line->>'quantity' IS NULL OR (line->>'quantity')!~'^[0-9]+(\.[0-9]{1,9})?$' OR (line->>'quantity')::numeric<=0 THEN RAISE EXCEPTION 'Positive decimal component quantity required'; END IF;
    IF coalesce(line->>'scrap','0')!~'^[0-9]+(\.[0-9]{1,9})?$' OR coalesce(line->>'scrap','0')::numeric>=100 THEN RAISE EXCEPTION 'Scrap must be from zero to below 100 percent'; END IF;
    SELECT * INTO ent FROM public.plm_entities WHERE id=(line->>'componentId')::uuid AND organization_id=_org AND kind='ITEM' AND (site_id IS NULL OR site_id IS NOT DISTINCT FROM _site);
    IF NOT FOUND THEN RAISE EXCEPTION 'Component is outside this organization/site'; END IF;
    IF ent.id=ref.entity_id THEN RAISE EXCEPTION 'BOM cycle: % -> %',ref.entity_id,ent.id; END IF;
    IF line->>'policy' NOT IN ('EXACT','LATEST_EFFECTIVE') OR line->>'policy' IS NULL THEN RAISE EXCEPTION 'Explicit component revision policy required'; END IF;
    IF line->>'policy'='EXACT' THEN SELECT * INTO ref FROM public.plm_revisions WHERE id=(line->>'revisionId')::uuid AND entity_id=ent.id AND organization_id=_org AND (site_id IS NULL OR site_id IS NOT DISTINCT FROM _site); IF NOT FOUND THEN RAISE EXCEPTION 'Exact component revision required'; END IF;
    ELSE SELECT * INTO ref FROM public.plm_revisions WHERE entity_id=ent.id AND organization_id=_org ORDER BY created_at DESC LIMIT 1; END IF;
    IF line->>'unit' IS DISTINCT FROM ref.payload->>'baseUnit' AND NOT EXISTS(SELECT 1 FROM public.plm_unit_conversions WHERE organization_id=_org AND item_entity_id=ent.id AND from_unit=line->>'unit' AND to_unit=ref.payload->>'baseUnit') THEN RAISE EXCEPTION 'Component unit needs an approved conversion'; END IF;
    IF _strict AND line->>'policy'='EXACT' AND ref.state<>'RELEASED' THEN findings:=findings||jsonb_build_array('Component revision is not released: '||ent.code); END IF;
    IF _strict AND line->>'policy'='LATEST_EFFECTIVE' AND (SELECT count(*) FROM public.plm_revisions WHERE entity_id=ent.id AND state='RELEASED' AND effective_from<=current_date AND (effective_to IS NULL OR effective_to>current_date) AND (site_id IS NULL OR site_id IS NOT DISTINCT FROM _site))<>1 THEN findings:=findings||jsonb_build_array('No unambiguous effective component: '||ent.code); END IF;
    IF coalesce(line->>'operationId','')<>'' AND NOT EXISTS(SELECT 1 FROM public.plm_revisions r CROSS JOIN LATERAL jsonb_array_elements(coalesce(r.payload->'operations','[]')) o WHERE r.organization_id=_org AND r.item_revision_id=_item AND o->>'id'=line->>'operationId' AND (r.site_id IS NULL OR r.site_id IS NOT DISTINCT FROM _site)) THEN RAISE EXCEPTION 'Consuming operation is not part of the linked item route'; END IF;
   END LOOP;
   WITH RECURSIVE edges AS (SELECT ir.entity_id parent,(l->>'componentId')::uuid child FROM public.plm_revisions br JOIN public.plm_entities be ON be.id=br.entity_id AND be.kind='BOM' JOIN public.plm_revisions ir ON ir.id=br.item_revision_id CROSS JOIN LATERAL jsonb_array_elements(coalesce(br.payload->'lines','[]')) l WHERE br.organization_id=_org AND (br.site_id IS NULL OR br.site_id IS NOT DISTINCT FROM _site) AND br.state NOT IN ('WITHDRAWN','SUPERSEDED') UNION SELECT (SELECT entity_id FROM public.plm_revisions WHERE id=_item),(l->>'componentId')::uuid FROM jsonb_array_elements(_payload->'lines') l), walk(node,nodes,cycle) AS (SELECT child,ARRAY[parent::text,child::text],parent=child FROM edges WHERE parent=(SELECT entity_id FROM public.plm_revisions WHERE id=_item) UNION ALL SELECT e.child,w.nodes||e.child::text,e.child::text=ANY(w.nodes) FROM walk w JOIN edges e ON e.parent=w.node WHERE NOT w.cycle AND cardinality(w.nodes)<100) SELECT nodes INTO path FROM walk WHERE cycle LIMIT 1;
   IF path IS NOT NULL THEN RAISE EXCEPTION 'BOM cycle: %',array_to_string(path,' -> '); END IF;
   IF _strict AND jsonb_array_length(_payload->'lines')=0 THEN findings:=findings||jsonb_build_array('No material lines; approved material-free applicability is required'); END IF;
   IF _strict AND EXISTS(SELECT 1 FROM jsonb_array_elements(_payload->'lines') l WHERE coalesce(l->>'recipeGroup','')<>'') THEN findings:=findings||jsonb_build_array('RMS recipe reconciliation is unavailable; double-demand coverage is Unknown'); END IF;
  ELSE
   IF _payload->>'structure' IS DISTINCT FROM 'LINEAR' THEN RAISE EXCEPTION 'Unsupported routing structure: only linear mandatory sequences are supported'; END IF;
   IF jsonb_typeof(_payload->'operations') IS DISTINCT FROM 'array' OR jsonb_array_length(_payload->'operations')>500 THEN RAISE EXCEPTION 'Operations must be a bounded array'; END IF;
   FOR op IN SELECT value FROM jsonb_array_elements(_payload->'operations') LOOP
    IF coalesce(op->>'id','')='' OR op->>'id'=ANY(seen) THEN RAISE EXCEPTION 'Operation IDs must be stable and unique'; END IF;
    IF jsonb_typeof(op->'predecessors') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Explicit predecessors required'; END IF;
    IF previous IS NULL AND jsonb_array_length(op->'predecessors')<>0 OR previous IS NOT NULL AND (jsonb_array_length(op->'predecessors')<>1 OR op->'predecessors'->>0 IS DISTINCT FROM previous) THEN RAISE EXCEPTION 'Unsupported branch, join or reordered predecessor: route must be linear'; END IF;
    IF coalesce(op->>'name','')='' THEN RAISE EXCEPTION 'Operation name required'; END IF;
    IF coalesce(op->>'setupMinutes','0')!~'^[0-9]+(\.[0-9]{1,9})?$' OR coalesce(op->>'runSeconds','0')!~'^[0-9]+(\.[0-9]{1,9})?$' OR coalesce(op->>'transferMinutes','0')!~'^[0-9]+(\.[0-9]{1,9})?$' THEN RAISE EXCEPTION 'Duration standards require nonnegative decimals'; END IF;
    IF coalesce(op->>'workCenterId','')<>'' AND NOT EXISTS(SELECT 1 FROM public.plm_entities WHERE id=(op->>'workCenterId')::uuid AND kind='WORK_CENTER' AND organization_id=_org AND (site_id IS NULL OR site_id IS NOT DISTINCT FROM _site)) THEN RAISE EXCEPTION 'Logical work center is outside scope'; END IF;
    seen:=array_append(seen,op->>'id'); previous:=op->>'id';
   END LOOP;
   IF _strict AND jsonb_array_length(_payload->'operations')=0 THEN findings:=findings||jsonb_build_array('Manufacturing route requires mandatory operations'); END IF;
   IF _payload->>'variant'='REWORK' AND (coalesce(_payload->>'entryOperationId','')='' OR coalesce(_payload->>'exitOperationId','')='' OR _payload->>'entryOperationId'<>ALL(seen) OR _payload->>'exitOperationId'<>ALL(seen)) THEN RAISE EXCEPTION 'Rework needs bounded entry and exit operations'; END IF;
  END IF;
 ELSIF _kind='PACKAGE' THEN
  FOR req IN SELECT value FROM jsonb_array_elements_text(coalesce(_payload->'revisionIds','[]')) LOOP
   SELECT * INTO ref FROM public.plm_revisions WHERE id=req::uuid AND organization_id=_org AND (site_id IS NULL OR site_id IS NOT DISTINCT FROM _site);
   IF NOT FOUND THEN RAISE EXCEPTION 'Package reference outside scope'; END IF;
   IF _strict AND ref.state<>'RELEASED' THEN findings:=findings||jsonb_build_array('Package references an unreleased revision: '||req); END IF;
  END LOOP;
  IF _strict THEN findings:=findings||jsonb_build_array('External engineering, recipe, quality and commissioning evidence must be verified for the exact scope'); END IF;
 ELSIF _kind='CHANGE' THEN
  IF jsonb_array_length(coalesce(_payload->'affectedRevisionIds','[]'))=0 THEN RAISE EXCEPTION 'At least one affected revision required'; END IF;
  FOR req IN SELECT value FROM jsonb_array_elements_text(_payload->'affectedRevisionIds') LOOP IF NOT EXISTS(SELECT 1 FROM public.plm_revisions WHERE id=req::uuid AND organization_id=_org AND (site_id IS NULL OR site_id IS NOT DISTINCT FROM _site)) THEN RAISE EXCEPTION 'Affected revision outside scope'; END IF; END LOOP;
 ELSIF _kind='WORK_CENTER' THEN IF jsonb_typeof(_payload->'capabilities') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Logical capabilities required'; END IF;
 END IF;
 RETURN findings;
END $$;
REVOKE ALL ON FUNCTION public.plm_validate_payload(text,jsonb,uuid,uuid,uuid,boolean) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.plm_validate_payload(text,jsonb,uuid,uuid,uuid,boolean) TO service_role;
CREATE FUNCTION public.plm_guard_revision() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF OLD.state IN ('RELEASED','SUPERSEDED','WITHDRAWN') AND (TG_OP='DELETE' OR NEW.payload IS DISTINCT FROM OLD.payload OR NEW.content_hash IS DISTINCT FROM OLD.content_hash OR NEW.entity_id IS DISTINCT FROM OLD.entity_id OR NEW.revision_label IS DISTINCT FROM OLD.revision_label OR NEW.effective_from IS DISTINCT FROM OLD.effective_from OR NEW.effective_to IS DISTINCT FROM OLD.effective_to OR NEW.author_id IS DISTINCT FROM OLD.author_id OR NEW.item_revision_id IS DISTINCT FROM OLD.item_revision_id OR NEW.organization_id IS DISTINCT FROM OLD.organization_id OR NEW.site_id IS DISTINCT FROM OLD.site_id OR NEW.state NOT IN ('RELEASED','SUPERSEDED','WITHDRAWN')) THEN RAISE EXCEPTION 'Released definition is immutable; create a controlled new revision'; END IF; RETURN NEW; END $$;
CREATE TRIGGER plm_revision_immutable BEFORE UPDATE OR DELETE ON public.plm_revisions FOR EACH ROW EXECUTE FUNCTION public.plm_guard_revision();
CREATE FUNCTION public.plm_command(_command jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE act text:=_command->>'action'; oid uuid:=(_command->>'organizationId')::uuid; sid uuid:=nullif(_command->>'siteId','')::uuid; eid uuid; rid uuid:=nullif(_command->>'revisionId','')::uuid; itemid uuid:=nullif(_command->>'itemRevisionId','')::uuid; r public.plm_revisions; e public.plm_entities; p jsonb:=coalesce(_command->'payload','{}'); findings jsonb; beforeval jsonb; h text; reviewid uuid; ticket public.plm_action_authorizations; env text; why text:=btrim(coalesce(_command->>'reason','')); label text; eventid uuid; correlation uuid:=gen_random_uuid(); target text; newstate text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.plm_has_scope(oid,sid) THEN RAISE EXCEPTION 'Unauthorized organization/site'; END IF;
 SELECT environment INTO env FROM public.plm_organizations WHERE id=oid;
 IF length(why) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'Provide a reason of 3 to 2000 characters'; END IF;
 IF act='create' THEN
  IF env<>'SANDBOX' THEN RAISE EXCEPTION 'Production authoring requires an authoritative scoped Access Hub contract'; END IF;
  IF length(btrim(_command->>'code')) NOT BETWEEN 2 AND 80 OR length(btrim(_command->>'name')) NOT BETWEEN 2 AND 200 THEN RAISE EXCEPTION 'Code and name required'; END IF;
  findings:=public.plm_validate_payload(_command->>'kind',p,oid,sid,itemid,false);
  INSERT INTO public.plm_entities(organization_id,site_id,kind,code,name,created_by) VALUES(oid,sid,_command->>'kind',btrim(_command->>'code'),btrim(_command->>'name'),auth.uid()) RETURNING id INTO eid;
  h:=public.plm_content_hash(p); INSERT INTO public.plm_revisions(entity_id,organization_id,site_id,revision_label,payload,content_hash,author_id,item_revision_id,reason) VALUES(eid,oid,sid,'A',p,h,auth.uid(),itemid,why) RETURNING * INTO r; rid:=r.id;
 ELSE
  SELECT * INTO r FROM public.plm_revisions WHERE id=rid AND organization_id=oid AND (site_id IS NULL OR site_id IS NOT DISTINCT FROM sid) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Revision not found in permitted scope'; END IF;
  SELECT * INTO e FROM public.plm_entities WHERE id=r.entity_id;
  IF r.version IS DISTINCT FROM (_command->>'expectedVersion')::integer THEN RAISE EXCEPTION 'VERSION_CONFLICT: draft changed; your local edits were not saved'; END IF;
  beforeval:=to_jsonb(r);
  IF act='validate' THEN RETURN jsonb_build_object('revision',to_jsonb(r),'findings',public.plm_validate_payload(e.kind,r.payload,oid,sid,r.item_revision_id,true)); END IF;
  IF act IN ('approve','reject','release','withdraw','supersede','publish') THEN
   SELECT * INTO ticket FROM public.plm_action_authorizations WHERE id=nullif(_command->>'authorizationId','')::uuid AND user_id=auth.uid() AND organization_id=oid AND site_id IS NOT DISTINCT FROM sid AND revision_id=rid AND candidate_hash=r.content_hash AND action=act AND expires_at>now() AND used_at IS NULL FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Fresh scoped Access Hub authorization required'; END IF;
   UPDATE public.plm_action_authorizations SET used_at=now() WHERE id=ticket.id;
  ELSIF env<>'SANDBOX' THEN RAISE EXCEPTION 'Production authoring requires Access Hub authority'; END IF;
  IF act='save' THEN
   IF r.state NOT IN ('DRAFT','IN_REVIEW','APPROVED') THEN RAISE EXCEPTION 'Released definition is immutable'; END IF;
   findings:=public.plm_validate_payload(e.kind,p,oid,sid,r.item_revision_id,false); h:=public.plm_content_hash(p);
   UPDATE public.plm_reviews SET invalidated_at=now() WHERE revision_id=rid AND invalidated_at IS NULL;
   UPDATE public.plm_revisions SET payload=p,content_hash=h,state='DRAFT',version=version+1,author_id=auth.uid(),reason=why,updated_at=now() WHERE id=rid RETURNING * INTO r;
  ELSIF act='copy' THEN
   label:=coalesce(nullif(_command->>'revisionLabel',''), 'R'||(SELECT count(*)+1 FROM public.plm_revisions WHERE entity_id=r.entity_id)::text);
   IF length(label)>40 THEN RAISE EXCEPTION 'Revision label too long'; END IF;
   INSERT INTO public.plm_revisions(entity_id,organization_id,site_id,revision_label,parent_revision_id,item_revision_id,payload,content_hash,author_id,reason) VALUES(r.entity_id,oid,r.site_id,label,r.id,r.item_revision_id,r.payload,r.content_hash,auth.uid(),why) RETURNING * INTO r; rid:=r.id;
  ELSIF act='submit' THEN
   IF r.state<>'DRAFT' THEN RAISE EXCEPTION 'Only a draft can be submitted'; END IF;
   findings:=public.plm_validate_payload(e.kind,r.payload,oid,sid,r.item_revision_id,true);
   INSERT INTO public.plm_reviews(revision_id,organization_id,site_id,candidate_hash,requested_by) VALUES(rid,oid,sid,r.content_hash,auth.uid());
   UPDATE public.plm_revisions SET state='IN_REVIEW',version=version+1,updated_at=now() WHERE id=rid RETURNING * INTO r;
  ELSIF act IN ('approve','reject') THEN
   IF r.state<>'IN_REVIEW' THEN RAISE EXCEPTION 'Only an in-review candidate can receive a decision'; END IF;
   IF r.author_id=auth.uid() THEN RAISE EXCEPTION 'Author cannot approve or reject their own controlled revision'; END IF;
   SELECT id INTO reviewid FROM public.plm_reviews WHERE revision_id=rid AND candidate_hash=r.content_hash AND invalidated_at IS NULL ORDER BY requested_at DESC LIMIT 1;
   IF reviewid IS NULL THEN RAISE EXCEPTION 'Review is stale or invalidated'; END IF;
   IF coalesce(_command->>'meaning','')='' THEN RAISE EXCEPTION 'Signature meaning required'; END IF;
   INSERT INTO public.plm_decisions(review_id,revision_id,organization_id,site_id,reviewer_id,candidate_hash,decision,meaning,reason,reauthenticated_at) VALUES(reviewid,rid,oid,sid,auth.uid(),r.content_hash,CASE WHEN act='approve' THEN 'APPROVED' ELSE 'REJECTED' END,_command->>'meaning',why,ticket.verified_at);
   UPDATE public.plm_revisions SET state=CASE WHEN act='approve' THEN 'APPROVED' ELSE 'DRAFT' END,version=version+1,updated_at=now() WHERE id=rid RETURNING * INTO r;
  ELSIF act='release' THEN
   IF env<>'PRODUCTION' THEN RAISE EXCEPTION 'Sandbox definitions cannot establish production release authority'; END IF;
   IF r.state<>'APPROVED' OR NOT EXISTS(SELECT 1 FROM public.plm_decisions d JOIN public.plm_reviews v ON v.id=d.review_id WHERE d.revision_id=rid AND d.candidate_hash=r.content_hash AND d.decision='APPROVED' AND d.reviewer_id<>r.author_id AND v.invalidated_at IS NULL) THEN RAISE EXCEPTION 'Independent approval of exact content required'; END IF;
   findings:=public.plm_validate_payload(e.kind,r.payload,oid,sid,r.item_revision_id,true);
   IF jsonb_array_length(findings)>0 THEN RAISE EXCEPTION 'Release blocked: %',findings; END IF;
   IF nullif(_command->>'effectiveFrom','') IS NULL THEN RAISE EXCEPTION 'Effectivity start required'; END IF;
   IF nullif(_command->>'effectiveTo','') IS NOT NULL AND (_command->>'effectiveTo')::date<=(_command->>'effectiveFrom')::date THEN RAISE EXCEPTION 'Effectivity end must follow start'; END IF;
   PERFORM 1 FROM public.plm_entities WHERE id=r.entity_id FOR UPDATE;
   IF EXISTS(SELECT 1 FROM public.plm_revisions x WHERE x.entity_id=r.entity_id AND x.id<>rid AND x.state='RELEASED' AND (x.site_id IS NULL OR sid IS NULL OR x.site_id=sid) AND daterange(x.effective_from,x.effective_to,'[)') && daterange((_command->>'effectiveFrom')::date,nullif(_command->>'effectiveTo','')::date,'[)')) THEN RAISE EXCEPTION 'Ambiguous overlapping effectivity'; END IF;
   UPDATE public.plm_revisions SET state='RELEASED',effective_from=(_command->>'effectiveFrom')::date,effective_to=nullif(_command->>'effectiveTo','')::date,version=version+1,updated_at=now() WHERE id=rid RETURNING * INTO r;
  ELSIF act IN ('withdraw','supersede') THEN
   IF r.state<>'RELEASED' THEN RAISE EXCEPTION 'Only released content can be withdrawn or superseded'; END IF;
   UPDATE public.plm_revisions SET state=CASE WHEN act='withdraw' THEN 'WITHDRAWN' ELSE 'SUPERSEDED' END,version=version+1,updated_at=now() WHERE id=rid RETURNING * INTO r;
  ELSIF act='publish' THEN
   IF env<>'PRODUCTION' OR r.state<>'RELEASED' THEN RAISE EXCEPTION 'Only an authorized released production definition can be published'; END IF;
  ELSIF act='checkout' THEN
   IF e.kind<>'DOCUMENT' THEN RAISE EXCEPTION 'Only documents can be checked out'; END IF;
   INSERT INTO public.plm_document_locks(entity_id,organization_id,site_id,owner_id) VALUES(e.id,oid,sid,auth.uid());
  ELSIF act='checkin' THEN
   DELETE FROM public.plm_document_locks WHERE entity_id=e.id AND owner_id=auth.uid(); IF NOT FOUND THEN RAISE EXCEPTION 'Only the checkout owner can check in'; END IF;
  ELSE RAISE EXCEPTION 'Unsupported command'; END IF;
 END IF;
 IF act IN ('release','publish','withdraw') THEN
  eventid:=gen_random_uuid();
  INSERT INTO public.plm_outbox(id,organization_id,site_id,revision_id,event_type,content_hash,correlation_id,envelope) VALUES(eventid,oid,sid,rid,CASE WHEN act='withdraw' THEN 'DefinitionWithdrawn' WHEN act='publish' THEN 'DefinitionPackagePublished' ELSE e.kind||'RevisionReleased' END,r.content_hash,correlation,jsonb_build_object('event_id',eventid,'event_type',CASE WHEN act='withdraw' THEN 'DefinitionWithdrawn' WHEN act='publish' THEN 'DefinitionPackagePublished' ELSE e.kind||'RevisionReleased' END,'schema_version','1.0','source_module','PLMS','organization_id',oid,'site_id',sid,'object_id',r.entity_id,'revision_id',rid,'content_hash',r.content_hash,'occurred_at',now(),'correlation_id',correlation,'causation_id',NULL,'payload',r.payload));
  FOR target IN SELECT value FROM jsonb_array_elements_text(coalesce(r.payload->'requiredConsumers','["MES"]')) LOOP INSERT INTO public.plm_delivery_attempts(event_id,organization_id,site_id,consumer,status,detail) VALUES(eventid,oid,sid,target,'PENDING','Awaiting configured consumer delivery and business acceptance'); END LOOP;
 END IF;
 INSERT INTO public.plm_audit_events(organization_id,site_id,actor_id,action,revision_id,reason,before_value,after_value,content_hash,correlation_id) VALUES(oid,sid,auth.uid(),act,rid,why,beforeval,to_jsonb(r),r.content_hash,correlation);
 RETURN jsonb_build_object('revision',to_jsonb(r),'findings',coalesce(findings,'[]'));
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'CONFLICT: code, revision label or document checkout already exists'; END $$;
REVOKE ALL ON FUNCTION public.plm_command(jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.plm_command(jsonb) TO authenticated;
CREATE FUNCTION public.plm_effective_revision(_entity uuid,_org uuid,_site uuid,_at date) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE result jsonb; n integer; BEGIN IF NOT public.plm_has_scope(_org,_site) THEN RAISE EXCEPTION 'Unauthorized scope'; END IF; SELECT count(*),jsonb_agg(to_jsonb(r)) INTO n,result FROM public.plm_revisions r WHERE entity_id=_entity AND organization_id=_org AND state='RELEASED' AND (site_id IS NULL OR site_id IS NOT DISTINCT FROM _site) AND effective_from<=_at AND (effective_to IS NULL OR effective_to>_at); IF n>1 THEN RAISE EXCEPTION 'Ambiguous effective revision'; END IF; RETURN CASE WHEN n=1 THEN result->0 ELSE NULL END; END $$;
REVOKE ALL ON FUNCTION public.plm_effective_revision(uuid,uuid,uuid,date) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.plm_effective_revision(uuid,uuid,uuid,date) TO authenticated;
