-- Account managers can read and manage invoices only for companies they are assigned to
create policy "Account managers manage their companies invoices"
  on public.invoices
  for all
  using (
    public.is_account_manager()
    and exists (
      select 1 from public.companies c
      where c.id = invoices.company_id and c.account_manager_id = auth.uid()
    )
  )
  with check (
    public.is_account_manager()
    and exists (
      select 1 from public.companies c
      where c.id = invoices.company_id and c.account_manager_id = auth.uid()
    )
  );
