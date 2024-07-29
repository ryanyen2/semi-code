'use client'

import dynamic from 'next/dynamic'
import '@tldraw/tldraw/tldraw.css'
// import { MakeRealButton } from './components/MakeRealButton'
// import { ExecuteCodeButton } from './components/ExecuteCodeButton'
import { ShareButtonGroup } from './components/ShareButtonGroup'
import { TldrawLogo } from './components/TldrawLogo'
import { RiskyButCoolAPIKeyInput } from './components/RiskyButCoolAPIKeyInput'
import { PreviewShapeUtil } from './PreviewShape/PreviewShape'
import { CodeEditorShapeUtil } from './CodeEditorShape/CodeEditorShape'


const Tldraw = dynamic(async () => (await import('@tldraw/tldraw')).Tldraw, {
	ssr: false,
})

const shapeUtils = [PreviewShapeUtil, CodeEditorShapeUtil]

export default function App() {
	return (
		<div className="editor">
			<Tldraw persistenceKey="make-real" shareZone={<ShareButtonGroup />} shapeUtils={shapeUtils}>
				{/* <TldrawLogo /> */}
				<RiskyButCoolAPIKeyInput />
			</Tldraw>
		</div>
	)
}
