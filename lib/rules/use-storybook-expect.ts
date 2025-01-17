/**
 * @fileoverview Use expect from '@storybook/jest'
 * @author Yann Braga
 */

import { CategoryId } from '../utils/constants'
import {
  isExpressionStatement,
  isCallExpression,
  isMemberExpression,
  isIdentifier,
  isBlockStatement,
} from '../utils/ast'

import { createStorybookRule } from '../utils/create-storybook-rule'

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

export = createStorybookRule({
  name: 'use-storybook-expect',
  defaultOptions: [],
  meta: {
    type: 'suggestion',
    fixable: 'code', // Or `code` or `whitespace`,
    hasSuggestions: true,
    schema: [],
    docs: {
      description: 'Use expect from `@storybook/jest`',
      categories: [CategoryId.ADDON_INTERACTIONS, CategoryId.RECOMMENDED],
      recommended: 'error',
    },
    messages: {
      updateImports: 'Update imports',
      useExpectFromStorybook:
        'Do not use expect from jest directly in the story. You should use from `@storybook/jest` instead.',
    },
  },

  create(context: any) {
    // variables should be defined here

    //----------------------------------------------------------------------
    // Helpers
    //----------------------------------------------------------------------

    const getExpressionStatements = (body = []) => {
      return body.filter((b) => isExpressionStatement(b))
    }

    //@ts-ignore
    const isExpect = (expression) => {
      return (
        isCallExpression(expression) &&
        isMemberExpression(expression.callee) &&
        isCallExpression(expression.callee.object) &&
        isIdentifier(expression.callee.object.callee) &&
        expression.callee.object.callee.name === 'expect'
      )
    }

    const isExpectFromStorybookImported = (node: any) => {
      return (
        node.source.value === '@storybook/jest' &&
        node.specifiers.find((spec: any) => spec.imported.name === 'expect')
      )
    }

    const checkExpectInvocations = (blockStatement) => {
      if (!isBlockStatement(blockStatement)) {
        return
      }

      const expressionBody = blockStatement.body || []
      const expressionStatements = getExpressionStatements(expressionBody)
      expressionStatements.forEach(({ expression }) => {
        if (isExpect(expression)) {
          expectInvocations.push(expression)
        }
      })
    }
    //----------------------------------------------------------------------
    // Public
    //----------------------------------------------------------------------

    let isImportingFromStorybookExpect = false
    let expectInvocations: any = []

    return {
      ImportDeclaration(node: any) {
        if (isExpectFromStorybookImported(node)) {
          isImportingFromStorybookExpect = true
        }
      },
      CallExpression(node) {
        if (!isIdentifier(node.callee)) {
          return null
        }

        if (node.callee.name === 'expect') {
          expectInvocations.push(node.callee)
        }
      },
      'Program:exit': function () {
        if (!isImportingFromStorybookExpect && expectInvocations.length) {
          //@ts-ignore
          expectInvocations.forEach((node) => {
            context.report({
              node,
              messageId: 'useExpectFromStorybook',
              fix: function (fixer: any) {
                return fixer.insertTextAfterRange(
                  [0, 0],
                  "import { expect } from '@storybook/jest';\n"
                )
              },
              suggest: [
                {
                  messageId: 'updateImports',
                  fix: function (fixer: any) {
                    return fixer.insertTextAfterRange(
                      [0, 0],
                      "import { expect } from '@storybook/jest';\n"
                    )
                  },
                },
              ],
            })
          })
        }
      },
    }
  },
})
