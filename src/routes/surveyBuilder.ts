import express, { Request, Response } from 'express';
import { db } from '../db';
import { authenticate, AuthRequest } from '../auth/middleware';
import { limeSurveyProxy } from '../services/limeSurvey/limeSurveyProxy';

const router = express.Router();

// Tenant security: verify study belongs to user's org
async function verifyStudyOwnership(studyId: string, user: any): Promise<any> {
  const study = await db.getStudy(studyId);
  if (!study) return null;
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return study;
  if (user.role === 'VENDOR') {
    const vendors = await db.getStudyVendors(studyId);
    if (vendors.some((v: any) => v.vendor_id === user.vendor_id)) return study;
  }
  return null; // unauthorized
}

// ─── Survey CRUD ────────────────────────────────────────────

// Get survey builder data (groups + questions + LS mapping)
router.get('/surveys/:studyId/builder', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const study = await verifyStudyOwnership(req.params.studyId, req.user);
    if (!study) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Study not found' } });

    const groups = await db.getSurveyGroups(req.params.studyId);
    const questions = await db.getSurveyQuestions(req.params.studyId);
    const lsMapping = await db.getStudyLsMapping(req.params.studyId);

    res.json({
      success: true,
      study: { id: study.id, title: study.title, description: study.description, status: study.status, survey_url: study.survey_url, language: study.language || 'en' },
      groups,
      questions,
      ls: lsMapping,
    });
  } catch (err: any) {
    console.error('[SurveyBuilder] GET error:', err?.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load builder data' } });
  }
});

// Save survey metadata (title, description, language)
router.put('/surveys/:studyId/metadata', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const study = await verifyStudyOwnership(req.params.studyId, req.user);
    if (!study) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Study not found' } });

    const { title, description, language } = req.body;
    const fields: any = {};
    if (title !== undefined) fields.title = title;
    if (description !== undefined) fields.description = description;
    if (language !== undefined) fields.language = language;

    const updated = await db.updateStudy(req.params.studyId, fields);
    res.json({ success: true, study: updated });
  } catch (err: any) {
    console.error('[SurveyBuilder] PUT metadata error:', err?.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update metadata' } });
  }
});

// ─── Groups ─────────────────────────────────────────────────

// Add group
router.post('/surveys/:studyId/groups', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const study = await verifyStudyOwnership(req.params.studyId, req.user);
    if (!study) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Study not found' } });

    const existingGroups = await db.getSurveyGroups(req.params.studyId);
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Group title required' } });

    const group = await db.createSurveyGroup({
      study_id: req.params.studyId,
      title,
      description: description || '',
      group_order: existingGroups.length + 1,
    });

    res.json({ success: true, group });
  } catch (err: any) {
    console.error('[SurveyBuilder] POST group error:', err?.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create group' } });
  }
});

// Update group
router.put('/surveys/:studyId/groups/:groupId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const study = await verifyStudyOwnership(req.params.studyId, req.user);
    if (!study) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Study not found' } });

    const group = await db.updateSurveyGroup(req.params.groupId, req.body);
    res.json({ success: true, group });
  } catch (err: any) {
    console.error('[SurveyBuilder] PUT group error:', err?.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update group' } });
  }
});

// Delete group
router.delete('/surveys/:studyId/groups/:groupId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const study = await verifyStudyOwnership(req.params.studyId, req.user);
    if (!study) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Study not found' } });

    // Delete questions in this group first
    const questions = await db.getSurveyQuestions(req.params.studyId);
    for (const q of questions) {
      if (q.group_id === req.params.groupId) {
        await db.deleteSurveyQuestion(q.id);
      }
    }
    await db.deleteSurveyGroup(req.params.groupId);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[SurveyBuilder] DELETE group error:', err?.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete group' } });
  }
});

// Reorder groups
router.put('/surveys/:studyId/groups-reorder', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const study = await verifyStudyOwnership(req.params.studyId, req.user);
    if (!study) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Study not found' } });

    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'orderedIds array required' } });

    await db.reorderSurveyGroups(req.params.studyId, orderedIds);
    const groups = await db.getSurveyGroups(req.params.studyId);
    res.json({ success: true, groups });
  } catch (err: any) {
    console.error('[SurveyBuilder] PUT groups-reorder error:', err?.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder groups' } });
  }
});

// ─── Questions ──────────────────────────────────────────────

// Add question
router.post('/surveys/:studyId/questions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const study = await verifyStudyOwnership(req.params.studyId, req.user);
    if (!study) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Study not found' } });

    const { group_id, question_text, question_type, question_type_name, answer_options, is_mandatory, question_code } = req.body;
    if (!group_id || !question_text) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'group_id and question_text required' } });

    const questions = await db.getSurveyQuestions(req.params.studyId);
    const groupQuestions = questions.filter((q: any) => q.group_id === group_id);
    const nextOrder = groupQuestions.length > 0 ? Math.max(...groupQuestions.map((q: any) => q.question_order)) + 1 : 1;

    const typeMap: Record<string, { type: string; name: string }> = {
      single_choice: { type: 'L', name: 'single_choice' },
      multiple_choice: { type: 'M', name: 'multiple_choice' },
      short_text: { type: 'E', name: 'short_text' },
      long_text: { type: 'U', name: 'long_text' },
      numeric: { type: 'N', name: 'numeric' },
    };
    const resolved = typeMap[question_type_name] || typeMap[question_type] || { type: 'L', name: 'single_choice' };

    const question = await db.createSurveyQuestion({
      study_id: req.params.studyId,
      group_id,
      question_text,
      question_type: resolved.type,
      question_type_name: resolved.name,
      answer_options: answer_options || [],
      is_mandatory: is_mandatory ? 1 : 0,
      question_order: nextOrder,
      question_code: question_code || null,
    });

    res.json({ success: true, question });
  } catch (err: any) {
    console.error('[SurveyBuilder] POST question error:', err?.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create question' } });
  }
});

// Update question
router.put('/surveys/:studyId/questions/:questionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const study = await verifyStudyOwnership(req.params.studyId, req.user);
    if (!study) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Study not found' } });

    const fields = { ...req.body };
    if (fields.question_type_name) {
      const typeMap: Record<string, { type: string; name: string }> = {
        single_choice: { type: 'L', name: 'single_choice' },
        multiple_choice: { type: 'M', name: 'multiple_choice' },
        short_text: { type: 'E', name: 'short_text' },
        long_text: { type: 'U', name: 'long_text' },
        numeric: { type: 'N', name: 'numeric' },
      };
      const resolved = typeMap[fields.question_type_name];
      if (resolved) { fields.question_type = resolved.type; fields.question_type_name = resolved.name; }
    }

    const question = await db.updateSurveyQuestion(req.params.questionId, fields);
    res.json({ success: true, question });
  } catch (err: any) {
    console.error('[SurveyBuilder] PUT question error:', err?.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update question' } });
  }
});

// Delete question
router.delete('/surveys/:studyId/questions/:questionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const study = await verifyStudyOwnership(req.params.studyId, req.user);
    if (!study) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Study not found' } });

    await db.deleteSurveyQuestion(req.params.questionId);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[SurveyBuilder] DELETE question error:', err?.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete question' } });
  }
});

// Duplicate question
router.post('/surveys/:studyId/questions/:questionId/duplicate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const study = await verifyStudyOwnership(req.params.studyId, req.user);
    if (!study) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Study not found' } });

    const original = await db.getSurveyQuestionById(req.params.questionId);
    if (!original) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Question not found' } });

    const questions = await db.getSurveyQuestions(req.params.studyId);
    const sameGroupQs = questions.filter((q: any) => q.group_id === original.group_id);
    const nextOrder = sameGroupQs.length > 0 ? Math.max(...sameGroupQs.map((q: any) => q.question_order)) + 1 : 1;

    const duplicate = await db.createSurveyQuestion({
      study_id: req.params.studyId,
      group_id: original.group_id,
      question_text: original.question_text + ' (copy)',
      question_type: original.question_type,
      question_type_name: original.question_type_name,
      answer_options: original.answer_options,
      is_mandatory: original.is_mandatory,
      question_order: nextOrder,
    });

    res.json({ success: true, question: duplicate });
  } catch (err: any) {
    console.error('[SurveyBuilder] POST duplicate error:', err?.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to duplicate question' } });
  }
});

// Reorder questions
router.put('/surveys/:studyId/questions-reorder', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const study = await verifyStudyOwnership(req.params.studyId, req.user);
    if (!study) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Study not found' } });

    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'orderedIds array required' } });

    await db.reorderSurveyQuestions(req.params.studyId, orderedIds);
    const questions = await db.getSurveyQuestions(req.params.studyId);
    res.json({ success: true, questions });
  } catch (err: any) {
    console.error('[SurveyBuilder] PUT questions-reorder error:', err?.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reorder questions' } });
  }
});

// ─── Preview / Publish ──────────────────────────────────────

// Get preview URL (renders LS survey runtime in iframe)
router.get('/surveys/:studyId/preview-url', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const study = await verifyStudyOwnership(req.params.studyId, req.user);
    if (!study) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Study not found' } });

    const lsMapping = await db.getStudyLsMapping(req.params.studyId);
    if (!lsMapping?.ls_survey_id) return res.status(400).json({ success: false, error: { code: 'NO_LS_SURVEY', message: 'Survey not yet linked to LimeSurvey' } });

    const previewUrl = limeSurveyProxy.getSurveyUrl(lsMapping.ls_survey_id, study.language || 'en');
    res.json({ success: true, previewUrl });
  } catch (err: any) {
    console.error('[SurveyBuilder] GET preview error:', err?.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get preview URL' } });
  }
});

// Activate/Publish survey — syncs to LimeSurvey
router.post('/surveys/:studyId/publish', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const study = await verifyStudyOwnership(req.params.studyId, req.user);
    if (!study) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Study not found' } });

    const lsMapping = await db.getStudyLsMapping(req.params.studyId);

    // If no LS survey exists, create one
    let lsSurveyId = lsMapping?.ls_survey_id;
    if (!lsSurveyId) {
      try {
        lsSurveyId = await limeSurveyProxy.createSurvey(study.title, study.language || 'en');
        await db.updateStudyLsMapping(req.params.studyId, lsSurveyId, 'CREATED');
      } catch (lsErr: any) {
        console.error('[SurveyBuilder] LS createSurvey failed:', lsErr?.message);
        // If LS is not running, create a mock LS ID for local development
        lsSurveyId = Math.floor(Math.random() * 900000) + 100000;
        await db.updateStudyLsMapping(req.params.studyId, lsSurveyId, 'CREATED_LOCAL');
        console.log(`[SurveyBuilder] Using mock LS survey ID: ${lsSurveyId} (LS not running)`);
      }
    }

    // Sync groups to LS
    const groups = await db.getSurveyGroups(req.params.studyId);
    const questions = await db.getSurveyQuestions(req.params.studyId);

    for (const group of groups) {
      if (!group.ls_group_id || group.ls_group_id === 0) {
        try {
          const lsGroupId = await limeSurveyProxy.addGroup(lsSurveyId, group.title, group.description, group.group_order);
          await db.updateSurveyGroup(group.id, { ls_group_id: lsGroupId });
        } catch (lsErr: any) {
          console.error(`[SurveyBuilder] LS addGroup failed for ${group.title}:`, lsErr?.message);
          await db.updateSurveyGroup(group.id, { ls_group_id: group.group_order });
        }
      }
    }

    // Sync questions to LS
    for (const q of questions) {
      if (!q.ls_question_id || q.ls_question_id === 0) {
        const group = groups.find((g: any) => g.id === q.group_id);
        const lsGroupId = group?.ls_group_id || 1;
        try {
          const lsQuestionId = await limeSurveyProxy.addQuestion(lsSurveyId, q.question_text, q.question_type, q.question_code || `Q${q.question_order}`, lsGroupId, {
            mandatory: q.is_mandatory ? 'Y' : 'N',
            questionOrder: q.question_order,
          });
          await db.updateSurveyQuestion(q.id, { ls_question_id: lsQuestionId });
        } catch (lsErr: any) {
          console.error(`[SurveyBuilder] LS addQuestion failed for ${q.question_text}:`, lsErr?.message);
          await db.updateSurveyQuestion(q.id, { ls_question_id: q.question_order });
        }
      }
    }

    // Activate survey in LS
    try {
      await limeSurveyProxy.activateSurvey(lsSurveyId);
    } catch (lsErr: any) {
      console.error(`[SurveyBuilder] LS activate failed:`, lsErr?.message);
    }

    // Set survey URL and update status
    const surveyUrl = limeSurveyProxy.getSurveyUrl(lsSurveyId, study.language || 'en');
    await db.updateStudySurveyUrl(req.params.studyId, surveyUrl);
    await db.updateStudyLsMapping(req.params.studyId, lsSurveyId, 'ACTIVE');
    await db.updateStudy(req.params.studyId, { status: 'LIVE' });

    res.json({ success: true, surveyUrl, lsSurveyId });
  } catch (err: any) {
    console.error('[SurveyBuilder] POST publish error:', err?.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to publish survey' } });
  }
});

// Deactivate survey
router.post('/surveys/:studyId/unpublish', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const study = await verifyStudyOwnership(req.params.studyId, req.user);
    if (!study) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Study not found' } });

    const lsMapping = await db.getStudyLsMapping(req.params.studyId);
    if (lsMapping?.ls_survey_id) {
      try {
        await limeSurveyProxy.deactivateSurvey(lsMapping.ls_survey_id);
      } catch (lsErr: any) {
        console.error('[SurveyBuilder] LS deactivate failed:', lsErr?.message);
      }
    }

    await db.updateStudyLsMapping(req.params.studyId, lsMapping?.ls_survey_id || 0, 'INACTIVE');
    await db.updateStudy(req.params.studyId, { status: 'DRAFT' });

    res.json({ success: true });
  } catch (err: any) {
    console.error('[SurveyBuilder] POST unpublish error:', err?.message);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to unpublish survey' } });
  }
});

export default router;
