import { fs, path } from 'houdini'
import { test, describe, expect } from 'vitest'

import { test_config } from '../test'
import { extract_load_function } from './extractLoadFunction'
import { houdini_after_load_fn, houdini_before_load_fn, houdini_load_fn } from './naming'

describe('extract_load_function', function () {
	const table: {
		title: string
		source: string
		expected: { exports: string[]; houdini_load?: string[] }
		artifacts?: Record<string, string>
	}[] = [
		{
			title: 'load single inline value',
			source: `
                import { graphql } from '$houdini'

                export const _houdini_load = graphql\`
                    query Foo {
                        viewer {
                            id
                        }
                    }
                \`
            `,
			expected: {
				exports: [houdini_load_fn],
				houdini_load: ['Foo'],
			},
		},
		{
			title: 'load single inline identifier',
			source: `
                import { graphql } from '$houdini'

                const store = graphql\`
                    query Foo {
                        viewer {
                            id
                        }
                    }
                \`

                export const _houdini_load = store
            `,
			expected: {
				exports: [houdini_load_fn],
				houdini_load: ['Foo'],
			},
		},
		{
			title: 'load single global factory identifier',
			source: `
                import { MyQueryStore } from '$houdini'

                const store = MyQueryStore()

                export const _houdini_load = store
            `,
			artifacts: {
				MyQuery: 'query MyQuery { viewer { id } }',
			},
			expected: {
				exports: [houdini_load_fn],
				houdini_load: ['MyQuery'],
			},
		},
		{
			title: 'load single default factory identifier',
			source: `
                import { MyQueryStore } from '$houdini/stores/MyQuery'

                const store = MyQueryStore()

                export const _houdini_load = store
            `,
			artifacts: {
				MyQuery: 'query MyQuery { viewer { id } }',
			},
			expected: {
				exports: [houdini_load_fn],
				houdini_load: ['MyQuery'],
			},
		},
		{
			title: 'load single global import',
			source: `
                import { GQL_Hello } from '$houdini'

                export const _houdini_load = GQL_Hello
            `,
			artifacts: {
				Hello: 'query Hello { viewer { id } }',
			},
			expected: {
				exports: [houdini_load_fn],
				houdini_load: [`Hello`],
			},
		},
		{
			title: 'load list with inline value',
			source: `
                import { graphql } from '$houdini'

                export const _houdini_load = [graphql\`query Hello { viewer { id } }\`]
            `,
			expected: {
				exports: [houdini_load_fn],
				houdini_load: ['Hello'],
			},
		},
		{
			title: 'load list with inline identifier',
			source: `
                import { graphql } from '$houdini'

                const store = graphql\`query Hello { viewer { id } }\`

                export const _houdini_load = [store]
            `,
			expected: {
				exports: [houdini_load_fn],
				houdini_load: ['Hello'],
			},
		},
		{
			title: 'load list with global import',
			source: `
                import { GQL_Hello } from '$houdini'

                export const _houdini_load = [GQL_Hello]
            `,
			artifacts: {
				Hello: 'query Hello { viewer { id } }',
			},
			expected: {
				exports: [houdini_load_fn],
				houdini_load: ['Hello'],
			},
		},
		{
			title: 'load list global factory identifier',
			source: `
                import { MyQueryStore } from '$houdini'

                const store = MyQueryStore()

                export const _houdini_load = [store]
            `,
			artifacts: {
				MyQuery: 'query MyQuery { viewer { id } }',
			},
			expected: {
				exports: [houdini_load_fn],
				houdini_load: ['MyQuery'],
			},
		},
		{
			title: 'load list default factory identifier',
			source: `
                import { MyQueryStore } from '$houdini/stores/MyQuery'

                const store = MyQueryStore()

                export const _houdini_load = [store]
            `,
			artifacts: {
				MyQuery: 'query MyQuery { viewer { id } }',
			},
			expected: {
				exports: [houdini_load_fn],
				houdini_load: ['MyQuery'],
			},
		},
		{
			title: 'exported function',
			source: `
                export function _houdini_afterLoad() {

                }

            `,
			expected: {
				exports: [houdini_after_load_fn],
			},
		},
		{
			title: 'exported const',
			source: `
                export const _houdini_afterLoad = () => {

                }
            `,
			expected: {
				exports: [houdini_after_load_fn],
			},
		},
		{
			title: 'exported let',
			source: `
                export let _houdini_afterLoad = () => {

                }
            `,
			expected: {
				exports: [houdini_after_load_fn],
			},
		},
		{
			title: 'multiple exports',
			source: `
                export let _houdini_afterLoad = () => {

                }

                export function _houdini_beforeLoad() {

                }
            `,
			expected: {
				exports: [houdini_after_load_fn, houdini_before_load_fn],
			},
		},
	]

	for (const row of table) {
		test(row.title, async function () {
			const config = await test_config()

			const targetPath = 'src/routes/foo'
			await fs.mkdirp(path.dirname(targetPath))
			await fs.writeFile(targetPath, row.source)

			const artifacts = Object.fromEntries(
				Object.entries(row.artifacts ?? {}).map(([key, value]) => [key, { raw: value }])
			)

			const extracted = await extract_load_function(config, targetPath, artifacts)

			expect(extracted.exports).toEqual(row.expected.exports)
			expect(extracted.houdini_load?.map((operation) => operation.name!.value)).toEqual(
				row.expected.houdini_load ?? []
			)
		})
	}
})
