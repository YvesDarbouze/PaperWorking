import { NextResponse } from 'next/server';
import { getAllProjectsAcrossStore, updateProjectInStore } from '@/lib/projects/project-store';
import { recordProjectActivity } from '@/lib/projects/activity';
import { sendGridService } from '@/lib/email/sendgrid-service';

/**
 * Scheduled Cron/Worker Endpoint for Basecamp-Style Automatic Check-ins.
 * Can be triggered via standard CRON headers or POST request.
 *
 * For every project with check-in questions:
 * 1. Checks if the question is scheduled for today (daily, weekly, biweekly).
 * 2. Emits check-in prompt emails via SendGrid to team members in assignedRoles.
 * 3. Records activity log entries indicating a check-in round was initiated.
 *
 * REQUIRES CREDENTIALS: SENDGRID_API_KEY
 */

export async function POST(request: Request) {
  const cronSecretHeader = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecretHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized cron dispatch' }, { status: 401 });
  }

  const projects = await getAllProjectsAcrossStore();
  let questionsEvaluated = 0;
  let notificationsDispatched = 0;
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri
  const isFriday = dayOfWeek === 5;
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  for (const project of projects) {
    const questions = project.checkInQuestions || [];
    if (questions.length === 0) continue;

    for (const q of questions) {
      questionsEvaluated++;
      let shouldTrigger = false;

      if (q.frequency === 'daily' && isWeekday) {
        shouldTrigger = true;
      } else if (q.frequency === 'weekly' && isFriday) {
        shouldTrigger = true;
      } else if (q.frequency === 'biweekly' && isFriday) {
        // Simple parity check for alternating weeks
        const weekNum = Math.floor(now.getTime() / (7 * 86400000));
        if (weekNum % 2 === 0) shouldTrigger = true;
      }

      if (!shouldTrigger) continue;

      // Find recipients from project.teamMembers
      const matchingMembers = (project.teamMembers || []).filter((m) =>
        q.assignedRoles.some((role) =>
          (m.role || '').toLowerCase().includes(role.toLowerCase()) ||
          role.toLowerCase().includes((m.role || '').toLowerCase())
        )
      );

      for (const member of matchingMembers) {
        if (!member.email) continue;

        try {
          await sendGridService.send({
            to: { email: member.email, name: member.name },
            subject: `[PaperWorking Check-in] ${project.propertyName}: ${q.prompt}`,
            text: `Hi ${member.name},\n\nThis is your automated project check-in for ${project.propertyName}:\n\n"${q.prompt}"\n\nPlease log in to PaperWorking to submit your status update:\n${process.env.NEXT_PUBLIC_APP_URL || 'https://paperworking.co'}/project/${project.id}?tool=checkins\n\n- The PaperWorking Team`,
          });
          notificationsDispatched++;
        } catch (err: any) {
          // Non-blocking mail dispatch warning (logs honest credentials notice if key absent)
          console.warn(`[checkins-cron] Mail dispatch to ${member.email} deferred or failed:`, err?.message || err);
        }
      }

      // Record activity entry
      await recordProjectActivity(project.id, {
        actorUid: 'system-checkins-daemon',
        actorName: 'PaperWorking Daemon',
        kind: 'checkin.round_opened',
        summary: `Dispatched automated check-in prompt: "${q.prompt.slice(0, 80)}"`,
        targetId: q.id,
        vendorVisible: false,
      });
    }
  }

  return NextResponse.json({
    success: true,
    evaluatedProjects: projects.length,
    questionsEvaluated,
    notificationsDispatched,
    timestamp: now.toISOString(),
  });
}

export async function GET(request: Request) {
  return POST(request);
}
