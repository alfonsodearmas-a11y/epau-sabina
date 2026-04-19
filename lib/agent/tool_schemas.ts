import { CATALOG_KINDS, INDICATOR_CATEGORIES, SCENARIOS, SEARCH_TOOLS } from './types';

const POINT_SCHEMA = {
  type: 'object',
  required: ['periodDate', 'value'],
  additionalProperties: false,
  properties: {
    periodDate: { type: 'string', description: 'ISO YYYY-MM-DD' },
    value: { type: ['number', 'null'] },
  },
} as const;

const POINT_ARRAY = { type: 'array', items: POINT_SCHEMA } as const;

const BATCHED_SERIES_ARRAY = {
  type: 'array',
  items: {
    type: 'object',
    required: ['id', 'series'],
    additionalProperties: false,
    properties: {
      id: { type: 'string' },
      series: POINT_ARRAY,
    },
  },
} as const;

export const AGENT_TOOLS = [
  {
    name: 'search_catalog',
    description:
      'Resolve a free-text query to a ranked list of indicators and/or comparison tables. ' +
      'This is the single search tool. Results carry a `kind` field of "indicator" or "comparison_table"; ' +
      'use it to decide whether to follow up with get_observations or get_comparison_table. ' +
      'Always call this before calling flag_unavailable.',
    input_schema: {
      type: 'object',
      required: ['query'],
      additionalProperties: false,
      properties: {
        query: { type: 'string' },
        category: { type: 'string', enum: INDICATOR_CATEGORIES },
        kinds: {
          type: 'array',
          items: { type: 'string', enum: CATALOG_KINDS },
        },
        limit: { type: 'integer', minimum: 1, maximum: 25 },
      },
    },
  },
  {
    name: 'get_observations',
    description:
      'Fetch observation values for one or more indicator ids, with metadata (unit, source, caveat, frequency, staleness). ' +
      'Unknown ids and ids with no data in range are returned in `missing`, not silently dropped. ' +
      'Every figure the agent cites in its final answer must come from this tool (or get_comparison_table / compute).',
    input_schema: {
      type: 'object',
      required: ['indicator_ids'],
      additionalProperties: false,
      properties: {
        indicator_ids: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 20,
        },
        start_date: { type: 'string' },
        end_date: { type: 'string' },
        scenario: { type: 'string', enum: SCENARIOS },
      },
    },
  },
  {
    name: 'compute',
    description:
      'Deterministic server-side arithmetic. Ops: yoy_growth, cagr, indexed, correlation (single only); ' +
      'ratio, share, difference (single or batched — pass an array on the varying side to compute many at once). ' +
      'Never do math in your head; even a single growth rate goes through this tool. ' +
      'The varying-side argument (`part` for share, `numerator` for ratio, `a` for difference) must be a JSON array, ' +
      'either [{periodDate, value}, ...] or [{id, series: [{periodDate, value}, ...]}, ...]. ' +
      'Never pass a stringified JSON array. ' +
      'When you need the same operation (for example share of total) for many components against one shared denominator, ' +
      'send one batched call with all components in the array, not one call per component.',
    input_schema: {
      type: 'object',
      required: ['operation'],
      properties: {
        operation: {
          type: 'string',
          enum: ['yoy_growth', 'cagr', 'indexed', 'correlation', 'ratio', 'share', 'difference'],
        },
        series: POINT_ARRAY,
        start: { type: 'string' },
        end: { type: 'string' },
        base_period: { type: 'string' },
        a: { oneOf: [POINT_ARRAY, BATCHED_SERIES_ARRAY] },
        b: POINT_ARRAY,
        numerator: { oneOf: [POINT_ARRAY, BATCHED_SERIES_ARRAY] },
        denominator: POINT_ARRAY,
        part: { oneOf: [POINT_ARRAY, BATCHED_SERIES_ARRAY] },
        total: POINT_ARRAY,
      },
    },
  },
  {
    name: 'render_chart',
    description:
      'Emit a chart to the chat panel. Must carry every observation inline; do not pre-summarise. ' +
      'chart_type: ' +
      'area (single monetary/stock series, cumulative feel); ' +
      'line (one or more series on a shared axis with matching units — the default for percent-vs-percent or currency-vs-same-currency comparisons); ' +
      'bar (discrete period comparisons); ' +
      'bar-paired (two scenarios on the same indicator, e.g. actual vs budget); ' +
      'dual (two series on a shared time axis but SEPARATE y-axes, used ONLY when the two series have genuinely different units, e.g. one in percent and one in G$ millions, or one in US$ millions and one in a ratio — do NOT use dual for two series that share the same unit; use line for same-unit comparisons); ' +
      'indexed (rebased to 100 at a base period).',
    input_schema: {
      type: 'object',
      required: ['chart_type', 'title', 'series'],
      additionalProperties: false,
      properties: {
        chart_type: { type: 'string', enum: ['area', 'line', 'bar', 'bar-paired', 'dual', 'indexed'] },
        title: { type: 'string' },
        subtitle: { type: 'string' },
        caveat: { type: 'string' },
        x_domain: {
          type: 'object',
          required: ['start', 'end'],
          additionalProperties: false,
          properties: {
            start: { type: 'string' },
            end: { type: 'string' },
          },
        },
        y_format: { type: 'string', enum: ['number', 'percent', 'currency_gyd', 'currency_usd'] },
        series: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['indicator_id', 'observations', 'unit'],
            additionalProperties: false,
            properties: {
              indicator_id: { type: 'string' },
              label: { type: 'string' },
              axis: { type: 'string', enum: ['left', 'right'] },
              observations: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['periodDate', 'value'],
                  additionalProperties: false,
                  properties: {
                    periodDate: { type: 'string' },
                    value: { type: ['number', 'null'] },
                    isEstimate: { type: 'boolean' },
                    scenario: { type: 'string', enum: SCENARIOS },
                  },
                },
              },
              unit: { type: 'string' },
            },
          },
        },
      },
    },
  },
  {
    name: 'render_table',
    description: 'Emit a table to the chat panel. Max 200 rows.',
    input_schema: {
      type: 'object',
      required: ['title', 'columns', 'rows'],
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        subtitle: { type: 'string' },
        caveat: { type: 'string' },
        columns: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['key', 'label'],
            additionalProperties: false,
            properties: {
              key: { type: 'string' },
              label: { type: 'string' },
              format: {
                type: 'string',
                enum: ['text', 'number', 'percent', 'currency_gyd', 'currency_usd', 'date'],
              },
              align: { type: 'string', enum: ['left', 'right'] },
            },
          },
        },
        rows: {
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
  },
  {
    name: 'render_commentary',
    description:
      'Emit a prose commentary block in EPAU house style. Lint warnings are surfaced but do not block. ' +
      'Word count default 150, range 80–250.',
    input_schema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        pullquote: { type: 'string' },
        caveat: { type: 'string' },
        word_count_target: { type: 'integer', minimum: 80, maximum: 250 },
      },
    },
  },
  {
    name: 'list_saved_views',
    description: 'List the current user\'s saved views by email. Scoped by session user.',
    input_schema: {
      type: 'object',
      required: ['user_email'],
      additionalProperties: false,
      properties: {
        user_email: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
    },
  },
  {
    name: 'get_saved_view',
    description: 'Fetch a specific saved view by id.',
    input_schema: {
      type: 'object',
      required: ['id'],
      additionalProperties: false,
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'list_comparison_tables',
    description:
      'List comparison tables. Discovery by search goes through search_catalog; this tool is for "give me everything in category X".',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        category: { type: 'string', enum: INDICATOR_CATEGORIES },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
    },
  },
  {
    name: 'get_comparison_table',
    description: 'Fetch the full contents of a comparison table by id.',
    input_schema: {
      type: 'object',
      required: ['id'],
      additionalProperties: false,
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'flag_unavailable',
    description:
      'Declare that the data needed to answer is not in the store. ' +
      'Required when search_catalog returns nothing useful, when the user asks for an indicator the workbook does not carry, ' +
      'or when the user asks for a period / scenario outside the data range. ' +
      '`searched` must be non-empty: you must have called search_catalog or list_comparison_tables at least once before calling this tool. ' +
      'The call is rejected if `searched` is empty.',
    input_schema: {
      type: 'object',
      required: ['reason', 'missing', 'searched'],
      additionalProperties: false,
      properties: {
        reason: { type: 'string' },
        missing: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['requested', 'closest_available'],
            additionalProperties: false,
            properties: {
              requested: { type: 'string' },
              closest_available: {
                type: 'array',
                description:
                  'Either empty (no nearby series), or a list of specific alternatives; ' +
                  'each entry must name an indicator_id or a comparison_table_id. ' +
                  'Do not add a why-only entry when no alternative exists.',
                items: {
                  type: 'object',
                  required: ['why'],
                  additionalProperties: false,
                  properties: {
                    indicator_id: { type: 'string' },
                    comparison_table_id: { type: 'string' },
                    why: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        searched: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['tool', 'query', 'top_hits'],
            additionalProperties: false,
            properties: {
              tool: { type: 'string', enum: SEARCH_TOOLS },
              query: { type: 'string' },
              top_hits: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        suggested_alternatives: { type: 'array', items: { type: 'string' } },
      },
    },
  },
] as const;

export type AgentToolName = (typeof AGENT_TOOLS)[number]['name'];
