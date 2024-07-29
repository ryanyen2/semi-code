/* eslint-disable react-hooks/rules-of-hooks */
import {
    Geometry2d,
    HTMLContainer,
    Rectangle2d,
    BaseBoxShapeUtil,
    TLBaseShape,
    ShapeUtil,
    toDomPrecision,
    DefaultSpinner,
    TLOnResizeHandler,
    resizeBox,
    SvgExportContext,
    useIsEditing,
    useValue,
    Vec,
} from '@tldraw/tldraw'

// import CodeMirror, { ViewUpdate, type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { useEffect } from 'react';

export type CodeEditorShape = TLBaseShape<
    'code-editor-shape',
    {
        w: number
        h: number
        html: string
        code: string
    }
>

export class CodeEditorShapeUtil extends BaseBoxShapeUtil<CodeEditorShape> {
    static override type = 'code-editor-shape' as const

    getDefaultProps(): CodeEditorShape['props'] {
        return {
            w: 400,
            h: 300,
            html: "<html><body><h1>Hello, World!</h1></body></html>",
            code: "code"
        }
    }

    override canEdit = () => true
    override isAspectRatioLocked = () => false
    override canResize = () => true
    override canBind = () => false
    override canUnmount = () => false


    override component(shape: CodeEditorShape) {
        const isEditing = useIsEditing(shape.id)

        const boxShadow = useValue(
            'box shadow',
            () => {
                const rotation = this.editor.getShapePageTransform(shape)!.rotation()
                return getRotatedBoxShadow(rotation)
            },
            [this.editor]
        )


        const escapedHtml = JSON.stringify(shape.props.html);
        const scriptToAppend = `<script src="https://unpkg.com/html2canvas"></script><script src="/js/cm6.bundle.min.js"></script><script>
        // send the screenshot to the parent window
        window.addEventListener('message', function(event) {
        if (event.data.action === 'take-screenshot' && event.data.shapeid === "${shape.id}") {
            html2canvas(document.body, {useCors : true}).then(function(canvas) {
            const data = canvas.toDataURL('image/png');
            window.parent.postMessage({screenshot: data, shapeid: "${shape.id}"}, "*");
            });
        }
        }, false);
        document.body.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); return }, { passive: false });
        document.body.addEventListener('touchmove', e => { e.preventDefault(); return }, { passive: false })
        const initialState = cm6.createEditorState(${escapedHtml});
        const view = cm6.createEditorView(initialState, document.getElementById("editor-${shape.id}"));
        view.setState(initialState);
        </script>`;

        // TODO: listen to code changes
        const htmlToUse = `<html><body><div id="editor-${shape.id}"></div>${scriptToAppend}</body></html>`;


        return (
            <HTMLContainer className="tl-embed-container" style={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd' }} id={shape.id}>
                {htmlToUse ? (
                    <iframe
                        id={`iframe-1-${shape.id}`}
                        srcDoc={htmlToUse}
                        width={toDomPrecision(shape.props.w)}
                        height={toDomPrecision(shape.props.h)}
                        draggable={false}
                        style={{
                            pointerEvents: isEditing ? 'auto' : 'none',
                            boxShadow,
                            border: '1px solid var(--color-panel-contrast)',
                            borderRadius: 'var(--radius-2)',
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'var(--color-muted-2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--color-muted-1)',
                        }}
                    >
                        <DefaultSpinner />
                    </div>
                )}
            </HTMLContainer>
        )
    }

    override toSvg(shape: CodeEditorShape, _ctx: SvgExportContext): SVGElement | Promise<SVGElement> {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        // while screenshot is the same as the old one, keep waiting for a new one
        return new Promise((resolve, _) => {
            if (window === undefined) return resolve(g)
            const windowListener = (event: MessageEvent) => {
                if (event.data.screenshot && event.data?.shapeid === shape.id) {
                    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image')
                    image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', event.data.screenshot)
                    image.setAttribute('width', shape.props.w.toString())
                    image.setAttribute('height', shape.props.h.toString())
                    g.appendChild(image)
                    window.removeEventListener('message', windowListener)
                    clearTimeout(timeOut)
                    resolve(g)
                }
            }
            const timeOut = setTimeout(() => {
                resolve(g)
                window.removeEventListener('message', windowListener)
            }, 2000)
            window.addEventListener('message', windowListener)
            //request new screenshot
            const firstLevelIframe = document.getElementById(`iframe-1-${shape.id}`) as HTMLIFrameElement
            if (firstLevelIframe) {
                firstLevelIframe.contentWindow!.postMessage(
                    { action: 'take-screenshot', shapeid: shape.id },
                    '*'
                )
            } else {
                console.log('first level iframe not found or not accessible')
            }
        })
    }

    indicator(shape: CodeEditorShape) {
        return <rect width={shape.props.w} height={shape.props.h} />
    }
}


function getRotatedBoxShadow(rotation: number) {
    const cssStrings = ROTATING_BOX_SHADOWS.map((shadow) => {
        const { offsetX, offsetY, blur, spread, color } = shadow
        const vec = new Vec(offsetX, offsetY)
        const { x, y } = vec.rot(-rotation)
        return `${x}px ${y}px ${blur}px ${spread}px ${color}`
    })
    return cssStrings.join(', ')
}

const ROTATING_BOX_SHADOWS = [
    {
        offsetX: 0,
        offsetY: 2,
        blur: 4,
        spread: -1,
        color: '#0000003a',
    },
    {
        offsetX: 0,
        offsetY: 3,
        blur: 12,
        spread: -2,
        color: '#0000001f',
    },
]


// [3]
// const customShape = [CodeEditorShapeUtil]
// export default function CustomShapeExample() {
// 	return (
// 		<div className="tldraw__editor">
// 			<Tldraw
// 				shapeUtils={customShape}
// 				onMount={(editor) => {
// 					editor.createShape({ type: 'code-editor-shape', x: 100, y: 100 })
// 				}}
// 			/>
// 		</div>
// 	)
// }