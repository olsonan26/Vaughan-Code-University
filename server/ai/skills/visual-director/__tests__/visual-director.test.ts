import { describe, it, expect } from 'vitest';
import {
  VISUAL_DIRECTOR_SYSTEM,
  visualPromptOutputSchema,
  buildVisualNeedsRequest,
  buildVisualPromptRequest,
  buildVisualPromptRevisionRequest,
  DEFAULT_VISUAL_IDENTITY,
} from '../index.js';
import type { VisualBriefDetails, VisualPromptOutput } from '../index.js';

describe('Visual Director Skill', () => {
  describe('Golden System Prompt Checks', () => {
    it('contains required core directives and concepts', () => {
      expect(VISUAL_DIRECTOR_SYSTEM).toContain('Visual Director');
      expect(VISUAL_DIRECTOR_SYSTEM.toLowerCase()).toContain('programmatic');
      expect(VISUAL_DIRECTOR_SYSTEM.toLowerCase()).toContain('aspect ratio');
      expect(VISUAL_DIRECTOR_SYSTEM).toMatch(/avoid/i);
      expect(VISUAL_DIRECTOR_SYSTEM.toLowerCase()).toContain('never invent');
      expect(VISUAL_DIRECTOR_SYSTEM).toContain('41');
      expect(VISUAL_DIRECTOR_SYSTEM).toContain('4 + 1 = 5');
    });
  });

  describe('VisualPromptOutput Schema Validation', () => {
    const validBrief: VisualBriefDetails = {
      title: 'Compound Number 41 Reduction',
      purpose: 'instructional',
      importance: 'ESSENTIAL',
      visualType: 'premium concept illustration',
      promptQuality: 'PREMIUM',
      teachingObjective: 'Explain that compound number 41 retains meaning before reducing to 5',
      conceptCommunicated: 'Compound 41 to reduced 5',
      placement: 'Lesson section 2 header',
      requiredElements: ['Digit 4', 'Digit 1', 'Reduction step 4+1=5', 'Digit 5'],
      composition: 'Landscape 16:9 with central focal hierarchy',
      lighting: 'Cinematic directional lighting',
      mood: 'Sophisticated and educational',
      brandStyle: 'Vaughan Code University Premium Editorial',
      colorDirection: 'Warm bronze, slate gray, subtle gold',
      textRequirements: 'Minimal labels only',
      accuracyRequirements: 'Exact mathematical reduction 4+1=5',
      aspectRatio: '16:9',
      negativeRequirements: ['No mystical cliches', 'No neon graphics'],
    };

    const strongPrompt =
      "Create a premium professional educational visual explaining the relationship between the compound number 41 and its reduced base value 5 in advanced name numerology. The primary visual subject is a refined, three-dimensional architectural installation featuring the bold compound digits '4' and '1' rendered in brushed warm metallic bronze. Position the digits side-by-side with distinct spatial separation to emphasize that 41 retains its compound identity before reduction. Below and slightly behind this primary element, a subtle glowing architectural channel guides the eye through the arithmetic reduction step: 4 + 1 = 5, culminating in a sculptured base digit '5' crafted from polished dark slate. Use cinematic directional studio lighting from the upper left, casting soft, realistic ambient shadows and creating rich tactile depth across the metallic surfaces. Set the composition against a deep slate gray negative space with subtle architectural grid lines in the background. The visual hierarchy must immediately direct the viewer's focus to the primary digits '41', then fluidly lead toward the calculated reduction '5'. Maintain an elegant, executive editorial aesthetic suitable for professional certification courseware. Landscape 16:9 composition with generous safe margins for typographic labels. Avoid mystical cliches, cheap neon glow effects, fantasy poster artwork, zodiac decorations, or extraneous clutter.";

    it('accepts a strong ~800-char PREMIUM prompt', () => {
      const validOutput: VisualPromptOutput = {
        brief: validBrief,
        renderMode: 'CHATGPT_IMAGE',
        chatgptPrompt: strongPrompt,
        programmaticSpec: null,
        altTextSuggestion:
          '3D visualization showing compound number 41 reducing to single digit 5 through arithmetic step 4+1=5',
      };

      const result = visualPromptOutputSchema.safeParse(validOutput);
      expect(result.success).toBe(true);
    });

    it('rejects the weak prompt "Create a diagram about compound numbers."', () => {
      const weakOutput: VisualPromptOutput = {
        brief: validBrief,
        renderMode: 'CHATGPT_IMAGE',
        chatgptPrompt: 'Create a diagram about compound numbers.',
        programmaticSpec: null,
        altTextSuggestion: 'Diagram about compound numbers',
      };

      const result = visualPromptOutputSchema.safeParse(weakOutput);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message).join('; ');
        expect(messages).toMatch(/at least 600 characters|aspect ratio|avoid/i);
      }
    });

    it('rejects prompts containing UUIDs', () => {
      const uuidPrompt =
        strongPrompt + ' Reference id: 123e4567-e89b-12d3-a456-426614174000.';
      const output: VisualPromptOutput = {
        brief: validBrief,
        renderMode: 'CHATGPT_IMAGE',
        chatgptPrompt: uuidPrompt,
        programmaticSpec: null,
        altTextSuggestion: 'Alt text',
      };

      const result = visualPromptOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('UUID'))).toBe(true);
      }
    });

    it('rejects prompts containing chunk: references', () => {
      const chunkPrompt = strongPrompt + ' Based on chunk:abc12345-6789-0000-1111-222233334444.';
      const output: VisualPromptOutput = {
        brief: validBrief,
        renderMode: 'CHATGPT_IMAGE',
        chatgptPrompt: chunkPrompt,
        programmaticSpec: null,
        altTextSuggestion: 'Alt text',
      };

      const result = visualPromptOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.toLowerCase().includes('chunk'))).toBe(true);
      }
    });

    it('rejects prompts missing the brief aspect ratio', () => {
      const noAspectPrompt = strongPrompt.replace('16:9', 'standard view');
      const output: VisualPromptOutput = {
        brief: { ...validBrief, aspectRatio: '21:9' },
        renderMode: 'CHATGPT_IMAGE',
        chatgptPrompt: noAspectPrompt,
        programmaticSpec: null,
        altTextSuggestion: 'Alt text',
      };

      const result = visualPromptOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('aspect ratio'))).toBe(true);
      }
    });

    it('rejects PROGRAMMATIC_DIAGRAM without programmaticSpec', () => {
      const output: VisualPromptOutput = {
        brief: validBrief,
        renderMode: 'PROGRAMMATIC_DIAGRAM',
        chatgptPrompt: null,
        programmaticSpec: null,
        altTextSuggestion: 'Calculation table for compound numbers',
      };

      const result = visualPromptOutputSchema.safeParse(output);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.message.includes('programmaticSpec'))).toBe(true);
      }
    });

    it('accepts PROGRAMMATIC_DIAGRAM with valid programmaticSpec', () => {
      const output: VisualPromptOutput = {
        brief: validBrief,
        renderMode: 'PROGRAMMATIC_DIAGRAM',
        chatgptPrompt: null,
        programmaticSpec: {
          kind: 'calculation',
          title: 'Compound 41 Reduction Step-by-Step',
          data: { formula: '4 + 1 = 5', input: 41, output: 5 },
        },
        altTextSuggestion: 'Calculation table showing 41 reduction to 5',
      };

      const result = visualPromptOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });
  });

  describe('Request Builders', () => {
    it('buildVisualNeedsRequest creates valid SkillRequest', () => {
      const req = buildVisualNeedsRequest({
        lessonTitle: 'Introduction to Compound Numbers',
        sections: [
          { index: 0, heading: 'Overview', bodyMarkdown: 'Compound numbers carry multi-digit energies.' },
          { index: 1, heading: 'Reduction Method', bodyMarkdown: 'Sum individual digits until reduced.' },
        ],
        density: 'balanced',
      });

      expect(req.skill).toBe('visual-director');
      expect(req.promptVersion).toBe('visual-director-v1');
      expect(req.tier).toBe('STANDARD');
      expect(req.userContent).toContain('Introduction to Compound Numbers');
      expect(req.userContent).toContain('DENSITY POLICY: balanced');
      expect(req.userContent).toContain(DEFAULT_VISUAL_IDENTITY.styleName);
    });

    it('buildVisualPromptRequest puts evidence ONLY in untrustedContext', () => {
      const evidence = [
        {
          id: '11111111-2222-3333-4444-555555555555',
          sourceTitle: 'Lettrology Core Manual',
          pageNumber: 42,
          sectionTitle: 'Compound Reductions',
          authority: 5,
          content: 'The compound number 41 is known as the Sage.',
        },
      ];

      const req = buildVisualPromptRequest({
        slot: {
          anchorSectionIndex: 1,
          need: 'ESSENTIAL',
          purpose: 'instructional',
          type: 'premium concept illustration',
          quality: 'PREMIUM',
          renderMode: 'CHATGPT_IMAGE',
          title: '41 Reduction Concept',
          rationale: 'Clarifies that 41 remains active prior to reduction',
          aspectRatio: '16:9',
        },
        lessonTitle: 'Understanding 41',
        objective: 'Master compound reduction of 41',
        sectionText: 'Section explaining 41 and 5.',
        conceptFacts: ['41 is a compound number', '4+1=5'],
        locked: [{ conceptName: 'Compound 41', statement: '41 retains distinct meaning before reduction to 5' }],
        evidence,
      });

      expect(req.skill).toBe('visual-director');
      expect(req.promptVersion).toBe('visual-director-v1');
      expect(req.tier).toBe('HIGH');
      expect(req.untrustedContext).toBeDefined();
      expect(req.untrustedContext).toHaveLength(1);
      expect(req.untrustedContext![0].label).toContain('chunk:11111111-2222-3333-4444-555555555555');
      expect(req.untrustedContext![0].text).toContain('The compound number 41 is known as the Sage.');

      // Evidence MUST NOT be duplicated in system prompt
      expect(req.system).not.toContain('The compound number 41 is known as the Sage.');
    });

    it('buildVisualPromptRevisionRequest creates valid SkillRequest', () => {
      const req = buildVisualPromptRevisionRequest({
        previous: {
          brief: {
            title: '41 Reduction Concept',
            purpose: 'instructional',
            importance: 'ESSENTIAL',
            visualType: 'illustration',
            promptQuality: 'PREMIUM',
            teachingObjective: 'Explain 41 reduction',
            conceptCommunicated: '41 -> 5',
            placement: 'Header',
            requiredElements: ['Digits 4 and 1'],
            composition: '16:9',
            mood: 'Sophisticated',
            brandStyle: 'VCU',
            colorDirection: 'Bronze and slate',
            textRequirements: 'None',
            accuracyRequirements: 'High',
            aspectRatio: '16:9',
            negativeRequirements: ['No neon'],
          },
          chatgptPrompt: 'Previous prompt text...',
        },
        instruction: 'Make the lighting more dramatic and cinematic.',
      });

      expect(req.skill).toBe('visual-director');
      expect(req.promptVersion).toBe('visual-director-v1');
      expect(req.tier).toBe('HIGH');
      expect(req.userContent).toContain('Make the lighting more dramatic and cinematic.');
    });
  });
});
