import js from '@eslint/js'
import pluginQuery from '@tanstack/eslint-plugin-query'
import eslintConfigPrettier from 'eslint-config-prettier/flat'
import pluginReact from 'eslint-plugin-react'
import reactCompiler from 'eslint-plugin-react-compiler'
import reactHooks from 'eslint-plugin-react-hooks'
import reactHooksExtra from 'eslint-plugin-react-hooks-extra'
import reactYouMightNotNeedAnEffect from 'eslint-plugin-react-you-might-not-need-an-effect'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import modalPlugin from './eslint-plugin-modal/index.js'

export default defineConfig([
	{
		ignores: ['dist/*'],
	},
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
			'no-unused-vars': 'off',
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
		rules: {
			'no-undef': 'off',
		},
	},
	reactCompiler.configs.recommended,
	eslintConfigPrettier,
	tseslint.configs.recommended,
	tseslint.configs.recommendedTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		ignores: [
			'dist/**/*.ts',
			'dist/**',
			'**/*.mjs',
			'eslint.config.mjs',
			'**/*.js',
			'.expo/**',
		],
	},
	{
		rules: {
			'@typescript-eslint/consistent-type-imports': 'error',
			'@typescript-eslint/no-misused-promises': [
				'error',
				{
					checksVoidReturn: false,
				},
			],
			// '@typescript-eslint/no-unsafe-call': 'off',
		},
	},
	{
		plugins: {
			modal: modalPlugin,
		},
		rules: {
			'modal/no-navigate-after-modal-close': 'error',
		},
	},
	reactYouMightNotNeedAnEffect.configs.recommended,
	{
		files: ['**/__tests__/*.{ts,tsx}'],
		rules: {
			'@typescript-eslint/unbound-method': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
		},
	},
])