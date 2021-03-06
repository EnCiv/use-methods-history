import { React, useState, useRef } from "react"
import useMethodsHistory from "../use-methods-history"
import useDoubleClick from "use-double-click"

const backgroundColorTable = [
    "red",
    "green",
    "blue",
    "cyan",
    "magenta",
    "yellow",
    "black",
    "purple",
    "darkred",
    "darkgreen",
    "darkblue",
    "darkcyan",
    "darkmagenta",
    "darkgoldenrod",
    "gray",
    "violet",
]
const Component = props => {
    const { umhKey, rect, keyType } = props
    const buttonRef = useRef()

    const [state, methods] = useMethodsHistory(
        (dispatch, state) => ({
            addRect(e) {
                console.info("addRect", umhKey)
                const rect = {
                    top: Math.floor(Math.random() * 100),
                    left: Math.floor(Math.random() * 100),
                    width: Math.floor(Math.random() * 100) + 50,
                    height: Math.floor(Math.random() * 100) + 50,
                    backgroundIndex: Math.floor(Math.random() * 8),
                }
                dispatch({ rects: state.rects.concat([rect]) })
            },
            toggleHidden(e) {
                console.info("toggleHidden", umhKey)
                dispatch({ hidden: !state.hidden })
            },
        }),
        { rects: [], hidden: false },
        umhKey
    )

    useDoubleClick({
        onSingleClick: methods.addRect,
        onDoubleClick: methods.toggleHidden,
        ref: buttonRef,
        latency: 250,
    })

    const keys = (i, rect) => {
        switch (keyType) {
            case "i":
                return methods.keys(i)
            case "rect":
                return methods.keys(Object.values(rect).join("-"))
            case "none":
            default:
                return { key: Object.values(rect).join("-") }
        }
    }

    return (
        <>
            <div
                ref={buttonRef}
                style={{
                    ...rect,
                    position: "absolute",
                    cursor: "pointer",
                    border: "solid black 1px",
                    backgroundColor: state.hidden
                        ? backgroundColorTable[rect.backgroundIndex]
                        : backgroundColorTable[rect.backgroundIndex + 8],
                }}
                key={Object.values(rect).join("-")}
            />
            {!state.hidden &&
                state.rects.map((rect, i) => {
                    return <Component rect={rect} {...keys(i, rect)} keyType={keyType} />
                })}
        </>
    )
}
const Name = "useMethodsHistory"

export default {
    title: Name,
    component: Component,
    argTypes: {},
}

const Template = args => {
    return (
        <div style={{ width: "calc(100vw - 2rem)", minHeight: "calc(100vh - 2rem)" }}>
            <div
                style={{
                    width: "48em",
                    marginLeft: "auto",
                    marginRight: "auto",
                    textAlign: "center",
                    padding: "1rem",
                    backgroundColor: "#fff",
                    minHeight: "calc(100vh - 2rem)",
                    position: "relative",
                }}
            >
                <Component
                    key="1"
                    rect={{ top: 100, left: 100, width: 100, height: 100, backgroundIndex: 7 }}
                    {...args}
                />
            </div>
        </div>
    )
}

export const WithKey = Template.bind({})
WithKey.args = { keyType: "rect", umhKey: "WithKey" }

export const WithIndexKey = Template.bind({})
WithIndexKey.args = { keyType: "i", umhKey: "WithIndexKey" }

export const WithOutKey = Template.bind({})
WithOutKey.args = {}
