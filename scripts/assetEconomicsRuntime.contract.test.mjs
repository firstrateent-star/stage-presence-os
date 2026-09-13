import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const sql=fs.readFileSync(new URL('../supabase/migrations/20260913052500_asset_economics_runtime_v1.sql',import.meta.url),'utf8')
const runtime=fs.readFileSync(new URL('../src/lib/assetEconomicsRuntime.ts',import.meta.url),'utf8')
const panel=fs.readFileSync(new URL('../src/components/AssetEconomicsPanel.tsx',import.meta.url),'utf8')

test('asset economics is a derived measurement layer',()=>{
 for(const view of ['resource_utilization_position_v','resource_maintenance_economics_v','resource_commercial_support_v','resource_asset_measurement_v']) assert.match(sql,new RegExp(view))
 assert.doesNotMatch(sql,/create table public\.asset_economics/i)
})

test('commercial support is not silently asset attribution',()=>{
 assert.match(sql,/commercial_line_revenue_supported/)
 assert.match(sql,/engagement_revenue_supported/)
 assert.match(sql,/contribution_supported/)
 assert.match(sql,/ACTUALS_BASELINE_COMPLETE/)
})

test('insufficient evidence is first-class',()=>{
 assert.match(sql,/INSUFFICIENT_EVIDENCE/)
 assert.match(sql,/VERIFY_PHYSICAL_INVENTORY/)
 assert.match(sql,/NO_ACTUAL_USAGE_HISTORY/)
 assert.match(sql,/NO_COMPLETE_ACTUAL_CONTRIBUTION_HISTORY/)
})

test('measurement UI is read-only and does not recommend investment actions',()=>{
 assert.match(runtime,/resource_asset_measurement_v/)
 assert.doesNotMatch(panel,/\.from\(/)
 assert.doesNotMatch(panel,/\.insert\(/)
 assert.doesNotMatch(panel,/\.update\(/)
 assert.doesNotMatch(panel,/REPLACE_REVIEW|EXPANSION_REVIEW|BUY|SELL/)
 assert.match(panel,/Not yet evidenced/)
})
