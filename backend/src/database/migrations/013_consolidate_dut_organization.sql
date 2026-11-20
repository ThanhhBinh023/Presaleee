-- Migration 013: Consolidate duplicate DUT organizations into canonical workspace
-- Canonical Org ID: '4206747f-b65f-4e4a-a431-b1345545d88e'

UPDATE organizations 
SET name = 'DUT'
WHERE id = '4206747f-b65f-4e4a-a431-b1345545d88e';

-- Consolidate users into canonical DUT org
UPDATE users 
SET organization_id = '4206747f-b65f-4e4a-a431-b1345545d88e'
WHERE organization_id IN (
  'fb5e76e1-edeb-450f-a579-4596feeaf8df',
  '8c4c2ffe-9ee1-4ae2-9e11-1c2d62fe8fae',
  'bee57320-5957-423e-8a5e-b8aa2ae97107'
);

-- Consolidate leads
UPDATE leads 
SET organization_id = '4206747f-b65f-4e4a-a431-b1345545d88e'
WHERE organization_id IN (
  'fb5e76e1-edeb-450f-a579-4596feeaf8df',
  '8c4c2ffe-9ee1-4ae2-9e11-1c2d62fe8fae',
  'bee57320-5957-423e-8a5e-b8aa2ae97107'
);

-- Consolidate proposals
UPDATE proposals 
SET organization_id = '4206747f-b65f-4e4a-a431-b1345545d88e'
WHERE organization_id IN (
  'fb5e76e1-edeb-450f-a579-4596feeaf8df',
  '8c4c2ffe-9ee1-4ae2-9e11-1c2d62fe8fae',
  'bee57320-5957-423e-8a5e-b8aa2ae97107'
);

-- Consolidate meetings
UPDATE meetings 
SET organization_id = '4206747f-b65f-4e4a-a431-b1345545d88e'
WHERE organization_id IN (
  'fb5e76e1-edeb-450f-a579-4596feeaf8df',
  '8c4c2ffe-9ee1-4ae2-9e11-1c2d62fe8fae',
  'bee57320-5957-423e-8a5e-b8aa2ae97107'
);

-- Consolidate clients
UPDATE clients 
SET organization_id = '4206747f-b65f-4e4a-a431-b1345545d88e'
WHERE organization_id IN (
  'fb5e76e1-edeb-450f-a579-4596feeaf8df',
  '8c4c2ffe-9ee1-4ae2-9e11-1c2d62fe8fae',
  'bee57320-5957-423e-8a5e-b8aa2ae97107'
);

-- Consolidate portal_sessions
UPDATE portal_sessions 
SET organization_id = '4206747f-b65f-4e4a-a431-b1345545d88e'
WHERE organization_id IN (
  'fb5e76e1-edeb-450f-a579-4596feeaf8df',
  '8c4c2ffe-9ee1-4ae2-9e11-1c2d62fe8fae',
  'bee57320-5957-423e-8a5e-b8aa2ae97107'
);

-- Consolidate proposal_portal_comments
UPDATE proposal_portal_comments 
SET organization_id = '4206747f-b65f-4e4a-a431-b1345545d88e'
WHERE organization_id IN (
  'fb5e76e1-edeb-450f-a579-4596feeaf8df',
  '8c4c2ffe-9ee1-4ae2-9e11-1c2d62fe8fae',
  'bee57320-5957-423e-8a5e-b8aa2ae97107'
);

-- Consolidate proposal_portal_materials
UPDATE proposal_portal_materials 
SET organization_id = '4206747f-b65f-4e4a-a431-b1345545d88e'
WHERE organization_id IN (
  'fb5e76e1-edeb-450f-a579-4596feeaf8df',
  '8c4c2ffe-9ee1-4ae2-9e11-1c2d62fe8fae',
  'bee57320-5957-423e-8a5e-b8aa2ae97107'
);

-- Consolidate knowledge_docs
UPDATE knowledge_docs 
SET organization_id = '4206747f-b65f-4e4a-a431-b1345545d88e'
WHERE organization_id IN (
  'fb5e76e1-edeb-450f-a579-4596feeaf8df',
  '8c4c2ffe-9ee1-4ae2-9e11-1c2d62fe8fae',
  'bee57320-5957-423e-8a5e-b8aa2ae97107'
);

-- Consolidate rate_cards
UPDATE rate_cards 
SET organization_id = '4206747f-b65f-4e4a-a431-b1345545d88e'
WHERE organization_id IN (
  'fb5e76e1-edeb-450f-a579-4596feeaf8df',
  '8c4c2ffe-9ee1-4ae2-9e11-1c2d62fe8fae',
  'bee57320-5957-423e-8a5e-b8aa2ae97107'
);

-- Consolidate audit_logs
UPDATE audit_logs 
SET organization_id = '4206747f-b65f-4e4a-a431-b1345545d88e'
WHERE organization_id IN (
  'fb5e76e1-edeb-450f-a579-4596feeaf8df',
  '8c4c2ffe-9ee1-4ae2-9e11-1c2d62fe8fae',
  'bee57320-5957-423e-8a5e-b8aa2ae97107'
);
