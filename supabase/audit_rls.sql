-- ============================================================================
-- SUPABASE RLS AUDIT SCRIPT
-- Returns all tables with RLS status and policy information
-- ============================================================================

SELECT 
    t.schemaname AS schema_name,
    t.tablename AS table_name,
    t.rowsecurity AS rls_enabled,
    COALESCE(p.policy_count, 0) AS policy_count,
    COALESCE(p.policy_names, '[]') AS policy_names
FROM pg_tables t
LEFT JOIN (
    SELECT 
        schemaname,
        tablename,
        COUNT(*) AS policy_count,
        array_agg(policyname) AS policy_names
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY schemaname, tablename
) p ON t.schemaname = p.schemaname AND t.tablename = p.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename;

-- ============================================================================
-- DETAILED RLS POLICY INSPECTION
-- Shows all policies with their configuration
-- ============================================================================

SELECT 
    schemaname AS schema_name,
    tablename AS table_name,
    policyname AS policy_name,
    permissive AS is_permissive,
    roles AS applicable_roles,
    cmd AS command_type,
    qual AS using_expression,
    with_check AS check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- RLS STATUS SUMMARY
-- Quick overview of security posture
-- ============================================================================

SELECT 
    COUNT(*) AS total_tables,
    COUNT(*) FILTER (WHERE rowsecurity = true) AS rls_enabled_tables,
    COUNT(*) FILTER (WHERE rowsecurity = false) AS rls_disabled_tables,
    COUNT(DISTINCT tablename) AS tables_with_policies
FROM pg_tables t
LEFT JOIN pg_policies p ON t.schemaname = p.schemaname AND t.tablename = p.tablename
WHERE t.schemaname = 'public';
