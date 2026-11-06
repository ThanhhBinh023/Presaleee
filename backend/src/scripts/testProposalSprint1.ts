import { container } from '../container.js';
import { dbPool } from '../infrastructure/database/connection.js';

async function runSprint1Verification() {
  console.log('🚀 Starting Backend Sprint 1 Verification...');
  const organizationId = process.env.TEST_ORGANIZATION_ID;
  const userId = process.env.TEST_USER_ID;
  if (!organizationId || !userId) {
    throw new Error('Set TEST_ORGANIZATION_ID and TEST_USER_ID to run this database verification script.');
  }

  try {
    // 1. Test Create Proposal with Default 10 Sheets
    console.log('\n[1/5] Testing CreateProposalUseCase...');
    const createdProposal = await container.createProposalUseCase.execute({
      title: 'E-Commerce Omnichannel Platform Modernization',
      organizationId,
      createdBy: userId,
      currency: 'USD',
      version: 'v1.0'
    });

    console.log(`✅ Proposal created successfully with ID: ${createdProposal.id}`);
    console.log(`   Title: ${createdProposal.title}`);
    console.log(`   Status: ${createdProposal.status}`);
    console.log(`   Total Cost: $${createdProposal.totalCost?.toLocaleString()}`);
    console.log(`   Estimated Timeline: ${createdProposal.estimatedTimelineWeeks} Weeks`);
    console.log(`   Number of Sheets: ${createdProposal.sheets.length}`);

    if (createdProposal.sheets.length !== 10) {
      throw new Error(`Expected 10 sheets, got ${createdProposal.sheets.length}`);
    }

    // 2. Test Get Proposal by ID
    console.log('\n[2/5] Testing GetProposalByIdUseCase...');
    const fetched = await container.getProposalByIdUseCase.execute(createdProposal.id, organizationId);
    console.log(`✅ Fetched proposal: ${fetched.title} (${fetched.sheets.length} sheets loaded)`);
    console.log(`   Sheet Names: ${fetched.sheets.map(s => s.sheetName).join(', ')}`);

    // 3. Test Update Sheet (Update Pricing Sheet)
    console.log('\n[3/5] Testing UpdateProposalSheetUseCase...');
    const pricingSheet = fetched.sheets.find(s => s.sheetName === 'Pricing & Quotation');
    if (!pricingSheet) throw new Error('Pricing sheet not found');

    const updatedData = {
      ...pricingSheet.sheetData,
      subtotal: 80000,
      taxAmount: 8000,
      grandTotal: 88000
    };

    const updatedSheet = await container.updateProposalSheetUseCase.execute({
      proposalId: createdProposal.id,
      organizationId,
      sheetName: 'Pricing & Quotation',
      sheetData: updatedData,
      aiGenerated: true
    });
    console.log(`✅ Sheet updated: ${updatedSheet.sheetName}`);

    // Verify parent proposal totalCost updated
    const fetchedAfterUpdate = await container.getProposalByIdUseCase.execute(createdProposal.id, organizationId);
    console.log(`   Parent proposal updated total cost: $${fetchedAfterUpdate.totalCost?.toLocaleString()}`);

    // 4. Test List Proposals
    console.log('\n[4/5] Testing ListProposalsUseCase...');
    const listResult = await container.listProposalsUseCase.execute({ organizationId, limit: 5 });
    console.log(`✅ Proposals listed: ${listResult.proposals.length} items (Total in DB: ${listResult.total})`);

    // 5. Test Export to Excel (.xlsx)
    console.log('\n[5/5] Testing ExportProposalToExcelUseCase...');
    const exportResult = await container.exportProposalToExcelUseCase.execute(createdProposal.id, organizationId);
    console.log(`✅ Excel Workbook generated successfully!`);
    console.log(`   Filename: ${exportResult.filename}`);
    console.log(`   Buffer size: ${(exportResult.buffer.length / 1024).toFixed(2)} KB`);

    if (exportResult.buffer.length < 5000) {
      throw new Error('Excel buffer is suspiciously small');
    }

    // Clean up
    console.log('\n🧹 Cleaning up test proposal...');
    await container.deleteProposalUseCase.execute(createdProposal.id, organizationId);
    console.log('✅ Test proposal deleted.');

    console.log('\n🎉 ALL SPRINT 1 BACKEND CHECKS PASSED 100%!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await dbPool.end();
  }
}

runSprint1Verification();
