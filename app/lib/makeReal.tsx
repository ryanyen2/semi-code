import { Editor, createShapeId, getSvgAsImage, track } from '@tldraw/tldraw'
import { getSelectionAsText } from './getSelectionAsText'
import { getHtmlFromOpenAI } from './getHtmlFromOpenAI'
import { getCodeFromOpenAI } from './getCodeFromOpenAI'

import { blobToBase64 } from './blobToBase64'
import { addGridToSvg } from './addGridToSvg'
import { PreviewShape } from '../PreviewShape/PreviewShape'
import { CodeEditorShape } from '../CodeEditorShape/CodeEditorShape'

import { downloadDataURLAsFile } from './downloadDataUrlAsFile'

export async function makeReal(editor: Editor, apiKey: string) {
	// Get the selected shapes (we need at least one)
	const selectedShapes = editor.getSelectedShapes()

	if (selectedShapes.length === 0) throw Error('First select something to make real.')

	// Create the preview shape
	const { maxX, midY } = editor.getSelectionPageBounds()!
	const newShapeId = createShapeId()
	// editor.createShape<PreviewShape>({
	// 	id: newShapeId,
	// 	type: 'response',
	// 	x: maxX + 60, // to the right of the selection
	// 	y: midY - (540 * 2) / 3 / 2, // half the height of the preview's initial shape
	// 	props: { html: '' },
	// })
	// TODO: d1eterine different actions: {1: edit: using diff view; 2: generate code; 3: execute code}

	editor.createShape<CodeEditorShape>({
		id: newShapeId,
		type: 'code-editor-shape',
		x: maxX + 60,
		y: midY - (540 * 2) / 3 / 2,
		props: {
			html: 'generating code...',
			w: 200,
			h: 300,
			code: ''
		},
	})

	// Get an SVG based on the selected shapes
	const svg = await editor.getSvg(selectedShapes, {
		scale: 1,
		background: true,
	})

	if (!svg) {
		return
	}

	// Add the grid lines to the SVG
	const grid = { color: 'red', size: 100, labels: true }
	addGridToSvg(svg, grid)

	if (!svg) throw Error(`Could not get the SVG.`)

	// Turn the SVG into a DataUrl
	const IS_SAFARI = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
	const blob = await getSvgAsImage(svg, IS_SAFARI, {
		type: 'png',
		quality: 0.8,
		scale: 1,
	})
	const dataUrl = await blobToBase64(blob!)
	// downloadDataURLAsFile(dataUrl, 'tldraw.png')

	// Get any previous previews among the selected shapes
	// const previousPreviews = selectedShapes.filter((shape) => {
	// 	return shape.type === 'response'
	// }) as PreviewShape[]
	const previousCodeEditors = selectedShapes.filter((shape) => {
		return shape.type === 'code-editor-shape'
	}) as CodeEditorShape[]

	// console.log('previousPreviews\n', previousPreviews)

	// Send everything to OpenAI and get some HTML back
	try {

		const json = await getCodeFromOpenAI({
			image: dataUrl,
			apiKey,
			text: getSelectionAsText(editor),
			// grid,
			previousCodeEditors,
		});
		// const json = await getHtmlFromOpenAI({
		// 	image: dataUrl,
		// 	apiKey,
		// 	text: getSelectionAsText(editor),
		// 	previousPreviews,
		// })
		console.log('res\n', json)

		if (!json) {
			throw Error('Could not contact OpenAI.')
		}

		if (json?.error) {
			throw Error(`${json.error.message?.slice(0, 128)}...`)
		}

		// const message = json.choices[0].message.content

		// editor.updateShape<PreviewShape>({
		// 	id: newShapeId,
		// 	type: 'response',
		// 	props: {
		// 		html: message,
		// 	},
		// })

		const message = json.choices[0].message.content
		const code = message.match(/```(python|javascript)([\s\S]*?)```/)?.[2] || message
		if (code.length < 30) {
			console.warn(message)
			throw Error('Could not generate a design from those wireframes.')
		}


		// calculate height of code editor (line-height = 1.4)
		const lines = code.split('\n').length;
		const height = Math.min(300, lines * 1.4 * 16)

		editor.updateShape<CodeEditorShape>({
			id: newShapeId,
			type: 'code-editor-shape',
			props: {
				html: code,
				h: height,
				w: 400,
				code: code
			},
		})
	} catch (e) {
		// If anything went wrong, delete the shape.
		editor.deleteShape(newShapeId)
		throw e
	}
}
