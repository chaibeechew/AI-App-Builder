-- Close the two performance-advisor gaps introduced by Creator Opportunity foreign keys.
create index if not exists app_builder_account_access_creator_opportunity_approved_by_idx
  on public.app_builder_account_access(creator_opportunity_approved_by)
  where creator_opportunity_approved_by is not null;

create index if not exists creator_opportunity_requests_decided_by_idx
  on public.creator_opportunity_requests(decided_by)
  where decided_by is not null;
