-- Allow super admins to delete properties (focus areas cascade via FK).
create policy "Super admins can delete properties"
  on public.company_properties
  for delete
  using (public.is_super_admin());

-- Allow super admins to delete focus areas.
create policy "Super admins can delete focus areas"
  on public.property_focus_areas
  for delete
  using (public.is_super_admin());
