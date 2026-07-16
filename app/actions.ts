"use server";

import { prisma } from "@/lib/db";

export async function getDashboardData() {
  const [candidates, pendingDocsCount, scheduledInterviewsCount, allInterviews, allPlacements, agents] = await Promise.all([
    prisma.candidate.findMany({ orderBy: { created_at: 'desc' } }),
    prisma.document.count({ where: { status: 'Pending' } }),
    prisma.interview.count({ where: { status: 'Scheduled' } }),
    prisma.interview.findMany({ select: { created_at: true } }),
    prisma.placement.findMany({ select: { created_at: true } }),
    prisma.agent.findMany({ orderBy: { created_at: 'desc' }, take: 5 })
  ]);

  return {
    candidates,
    pendingDocsCount,
    scheduledInterviewsCount,
    allInterviews,
    allPlacements,
    agents
  };
}

export async function getMapsData() {
  const [jobs, agents, staff] = await Promise.all([
    prisma.jobCategory.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.agent.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ select: { id: true, email: true } })
  ]);
  
  return { jobs, agents, staff };
}

export async function updateCandidate(id: string, data: any) {
  return await prisma.candidate.update({
    where: { id },
    data
  });
}

export async function getAgentsAndTeam() {
  const [agents, team] = await Promise.all([
    prisma.agent.findMany({ orderBy: { created_at: 'desc' } }),
    prisma.user.findMany({ orderBy: { created_at: 'desc' } })
  ]);
  
  return { agents, team };
}

export async function addAgent(name: string, phone: string) {
  return await prisma.agent.create({
    data: { name, phone }
  });
}

export async function getJobCategories() {
  return await prisma.jobCategory.findMany({ orderBy: { name: 'asc' } });
}

export async function addJobCategory(name: string) {
  return await prisma.jobCategory.create({ data: { name } });
}

export async function updateJobCategory(id: string, name: string) {
  return await prisma.jobCategory.update({ where: { id }, data: { name } });
}

export async function deleteJobCategory(id: string) {
  return await prisma.jobCategory.delete({ where: { id } });
}

import { auth } from "@/auth";

export async function getCurrentProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return await prisma.user.findUnique({ where: { id: session.user.id } });
}

export async function addCandidate(data: any) {
  if (data.dob) {
    data.dob = new Date(data.dob);
  }
  return await prisma.candidate.create({
    data
  });
}

export async function getCandidateDetails(id: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      documents: { orderBy: { created_at: 'desc' } },
      interviews: { orderBy: { interview_date: 'asc' } },
      placements: true
    }
  });

  const [agents, staff] = await Promise.all([
    prisma.agent.findMany({ select: { id: true, name: true, phone: true } }),
    prisma.user.findMany({ select: { id: true, email: true } })
  ]);

  return { candidate, agents, staff };
}

export async function deleteCandidate(id: string) {
  return await prisma.candidate.delete({ where: { id } });
}

export async function addPlacement(data: any) {
  if (data.start_date) {
    data.start_date = new Date(data.start_date);
  }
  const placement = await prisma.placement.create({ data });
  if (data.candidate_id) {
    await prisma.candidate.update({
      where: { id: data.candidate_id },
      data: { status: "Placed" }
    });
  }
  return placement;
}

export async function updatePlacement(id: string, data: any) {
  if (data.start_date) {
    data.start_date = new Date(data.start_date);
  }
  return await prisma.placement.update({
    where: { id },
    data
  });
}

export async function addInterview(data: any) {
  if (data.interview_date) {
    data.interview_date = new Date(data.interview_date);
  }
  return await prisma.interview.create({ data });
}

export async function updateInterview(id: string, data: any) {
  if (data.interview_date) {
    data.interview_date = new Date(data.interview_date);
  }
  return await prisma.interview.update({
    where: { id },
    data
  });
}

export async function getCandidateStatusLogs(candidateId: string) {
  return await prisma.candidateStatusLog.findMany({
    where: { candidate_id: candidateId },
    orderBy: { created_at: 'desc' }
  });
}

export async function addCandidateStatusLog(data: any) {
  return await prisma.candidateStatusLog.create({ data });
}

export async function getCandidatesList() {
  const [candidates, jobCategories] = await Promise.all([
    prisma.candidate.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        agent: { select: { name: true } }
      }
    }),
    prisma.jobCategory.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    })
  ]);

  // Format candidates to match the expected structure
  const formattedCandidates = candidates.map(c => ({
    ...c,
    agents: c.agent ? { name: c.agent.name } : null
  }));

  return { candidates: formattedCandidates, jobCategories };
}

export async function bulkDeleteCandidates(ids: string[]) {
  // Delete related records first to avoid foreign key constraints
  await prisma.document.deleteMany({ where: { candidate_id: { in: ids } } });
  await prisma.interview.deleteMany({ where: { candidate_id: { in: ids } } });
  await prisma.placement.deleteMany({ where: { candidate_id: { in: ids } } });
  await prisma.candidateStatusLog.deleteMany({ where: { candidate_id: { in: ids } } });
  
  // Delete candidates
  return await prisma.candidate.deleteMany({
    where: { id: { in: ids } }
  });
}

export async function bulkImportCandidates(rows: any[]) {
  let inserted = 0;
  let skipped = 0;
  const skippedNames: string[] = [];

  for (const row of rows) {
    const passportNumber = row['Passport Number']?.trim() || null;
    const candidateName = row['Full Name']?.trim() || 'Unknown';

    if (passportNumber) {
      const existing = await prisma.candidate.findUnique({
        where: { passport_number: passportNumber }
      });

      if (existing) {
        skipped++;
        skippedNames.push(candidateName);
        continue;
      }
    }

    try {
      await prisma.candidate.create({
        data: {
          name: candidateName,
          passport_number: passportNumber,
          gender: row['Gender']?.trim() || null,
          nationality: row['Nationality']?.trim() || null,
          current_role: row['Job Title']?.trim() || null,
          skills: row['Skills'] ? row['Skills'].split(',').map((s: string) => s.trim()) : [],
          destination_country: row['Preferred Country']?.trim() || null,
          phone: row['Phone']?.trim() || null,
          additional_info: { marital_status: row['Marital Status']?.trim() || null },
          status: 'New',
        }
      });
      inserted++;
    } catch (e) {
      console.error("Error inserting candidate", e);
    }
  }

  return { inserted, skipped, skippedNames };
}
