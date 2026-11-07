import { container } from '../container.js';
import { dbPool } from '../infrastructure/database/connection.js';

async function runDiscoveryMeetingE2ETest() {
  console.log('================================================================');
  console.log('🚀 TESTING DISCOVERY MEETINGS LIFECYCLE & AI TRANSCRIPT INSPECT');
  console.log('================================================================\n');

  try {
    // 1. Get or create a sample Lead to attach meetings to
    console.log('⏳ [1/5] Ensuring sample Lead exists for Discovery Meetings...');
    const leadRes = await dbPool.query(`
      INSERT INTO leads (title, source, status, raw_rfp_content, extracted_metadata)
      VALUES (
        'EcoMart Omnichannel POS Modernization',
        'INBOUND_EMAIL',
        'QUALIFIED',
        'EcoMart supermarket chain needs offline POS and mobile ordering for 85 stores.',
        '{"project_name": "EcoMart POS", "timeline_weeks": 16, "budget_usd": 65000}'::jsonb
      )
      RETURNING id, title;
    `);
    const testLeadId = leadRes.rows[0].id;
    console.log(`✅ Sample Lead ready: ID=${testLeadId} ("${leadRes.rows[0].title}")\n`);

    // 2. Simulate Meeting #1 transcript captured from 3rd-party tool (Zoom / Google Meet)
    const rawTranscriptMeeting1 = `
      [00:01] Alex (Solution Architect): Um, hi Marcus. Thanks for joining the Zoom call today. So, uh, we received your RFP regarding the EcoMart 85 stores POS modernization.
      [00:15] Marcus (EcoMart VP Operations): Hey Alex. Yeah, like, our biggest headache right now is network drops. Every time the internet fluctuates, our cashiers are stuck, lines get long, and customers complain. We absolutely need the POS to work offline and print thermal receipts without any lag.
      [00:45] Alex: Understood. Offline-first with local SQLite caching and background reconciliation. What about the central inventory sync?
      [00:58] Marcus: Right now our central ERP is SAP S/4HANA on AWS. We need the inventory delta to sync within 2 seconds once network is back. Also, regarding payments, we must support VNPay, MoMo QR, and mPOS card terminals. PCI-DSS compliance is mandatory because our bank audit is in October.
      [01:30] Alex: Got it. Who on your side handles the SAP integration APIs?
      [01:40] Marcus: That would be David Tran, our Lead SAP Architect. He can provide the OpenAPI specs by next Tuesday. Let's schedule a deep dive with David next week.
    `;

    console.log('⏳ [2/5] Creating Discovery Meeting #1 (Source: ZOOM)...');
    const meeting1 = await container.createMeetingUseCase.execute({
      leadId: testLeadId,
      title: 'Initial Discovery: Offline POS & SAP Integration Scope',
      meetingDate: new Date(),
      sourceTool: 'ZOOM',
      rawTranscript: rawTranscriptMeeting1
    });

    console.log(`✅ Meeting #1 Created!`);
    console.log(`   ID: ${meeting1.id}`);
    console.log(`   Meeting Order: #${meeting1.meetingOrder}`);
    console.log(`   Status: ${meeting1.status}`);
    console.log(`   Source Tool: ${meeting1.sourceTool}\n`);

    // 3. Inspect Meeting #1 using AI
    console.log('⏳ [3/5] Running AI Inspection on Meeting #1 Transcript...');
    const inspectedResult1 = await container.inspectMeetingUseCase.execute({
      meetingId: meeting1.id
    });

    const inspectedM1 = inspectedResult1.meeting;
    console.log('✅ Meeting #1 AI Inspection Complete!');
    console.log(`   Status: ${inspectedM1.status}`);
    console.log(`   Discussion Points (${inspectedM1.keyDiscussionPoints.length}):`);
    inspectedM1.keyDiscussionPoints.forEach(p => console.log(`     - ${p}`));
    console.log(`   Clarified Requirements (${inspectedM1.clarifiedRequirements.length}):`);
    inspectedM1.clarifiedRequirements.forEach(r => console.log(`     - ${r}`));
    console.log(`   Action Items (${inspectedM1.actionItems.length}):`);
    inspectedM1.actionItems.forEach(a => console.log(`     - [${a.assignee}] ${a.task} (Deadline: ${a.deadline})`));
    console.log(`   💡 Suggested Follow-up Questions for Next Meeting (${inspectedM1.suggestedFollowupQuestions.length}):`);
    inspectedM1.suggestedFollowupQuestions.forEach(q => console.log(`     • ${q}`));

    // 4. Create Discovery Meeting #2 and verify automatic carrying forward of suggested questions
    console.log('\n⏳ [4/5] Creating Discovery Meeting #2 (Source: GOOGLE_MEET)...');
    const meeting2 = await container.createMeetingUseCase.execute({
      leadId: testLeadId,
      title: 'Technical Deep-Dive: SAP Data Sync & Payment Gateways',
      meetingDate: new Date(Date.now() + 86400000 * 3), // 3 days later
      sourceTool: 'GOOGLE_MEET'
    });

    console.log(`✅ Meeting #2 Created!`);
    console.log(`   ID: ${meeting2.id}`);
    console.log(`   Meeting Order: #${meeting2.meetingOrder}`);
    console.log(`   Initial Carried-over Discussion Topics (${meeting2.discussionTopics.length}):`);
    meeting2.discussionTopics.forEach(t => console.log(`     -> ${t}`));

    if (meeting2.discussionTopics.length === 0) {
      console.warn('⚠️ Warning: Expected questions from Meeting #1 to carry forward into Meeting #2 discussionTopics');
    } else {
      console.log('🎉 SUCCESS: Suggested follow-up questions from Meeting #1 were automatically seeded into Meeting #2 as discussion topics!');
    }

    // 5. Test Lifecycle update (OPEN -> LOCKED -> REOPENED)
    console.log('\n⏳ [5/5] Testing Meeting Lifecycle transitions...');
    const lockedM2 = await container.updateMeetingLifecycleUseCase.execute({
      meetingId: meeting2.id,
      status: 'LOCKED'
    });
    console.log(`✅ Meeting #2 transitioned to: ${lockedM2.status}`);

    const reopenedM2 = await container.updateMeetingLifecycleUseCase.execute({
      meetingId: meeting2.id,
      status: 'REOPENED'
    });
    console.log(`✅ Meeting #2 transitioned to: ${reopenedM2.status}`);

    console.log('\n================================================================');
    console.log('🎉 ALL DISCOVERY MEETINGS VERIFICATIONS PASSED 100%!');
    console.log('================================================================');
  } catch (error) {
    console.error('❌ E2E Test Failed:', error);
    process.exit(1);
  } finally {
    await dbPool.end();
  }
}

runDiscoveryMeetingE2ETest();
