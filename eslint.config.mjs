import js from '@eslint/js'
import pluginQuery from '@tanstack/eslint-plugin-query'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import pluginReact from 'eslint-plugin-react'
import reactCompiler from 'eslint-plugin-react-compiler'
import reactHooks from 'eslint-plugin-react-hooks'
import reactHooksExtra from 'eslint-plugin-react-hooks-extra'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig([
	{
		files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
		plugins: { js },
		extends: ['js/recommended', reactHooksExtra.configs.recommended],
		rules: {
			'react-hooks-extra/no-direct-set-state-in-use-effect': 'off',
			'react-hooks-extra/no-unnecessary-use-prefix': 'error',
			'react-hooks-extra/prefer-use-state-lazy-initialization': 'error',
		},
	},
	tseslint.configs.recommended,
	tseslint.config({
		rules: {
			'@typescript-eslint/consistent-type-imports': 'error',
		},
	}),
	{
		...pluginReact.configs.flat.recommended,
		settings: {
			react: {
				version: 'detect',
			},
		},
	},
	pluginReact.configs.flat['jsx-runtime'],
	...pluginQuery.configs['flat/recommended'],
	reactHooks.configs['recommended-latest'],
	{
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					args: 'all',
					argsIgnorePattern: '^_',
					caughtErrors: 'all',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					ignoreRestSiblings: true,
				},
			],
		},
	},
	{
		files: ['*.ts', '*.js'],
		rules: {
			'no-undef': 'off',
		},
	},
	reactCompiler.configs.recommended,
	eslintConfigPrettier,
	// {
	// 	plugins: {
	// 		drizzle,
	// 	},
	// 	rules: {
	// 		...drizzle.configs.recommended.rules,
	// 	},
	// },
])
