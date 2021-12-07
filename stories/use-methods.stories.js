import { React, useState, useRef } from 'react'
import useMethods from '../use-methods'
import useDoubleClick from 'use-double-click'

const backgroundColorTable=['red','green','blue','cyan','magenta','yellow','black','purple']
const Component = props =>{
    const {umsKey, rect}=props
    const buttonRef=useRef()

    const [state,methods]=useMethods((dispatch,state)=>({
        addRect(e){
            console.info("addRect",umsKey)
            const rect={
                top: Math.floor(Math.random()*100),
                left: Math.floor(Math.random()*100),
                width: Math.floor(Math.random()*100),
                height: Math.floor(Math.random()*100),
                backgroundColor: backgroundColorTable[Math.floor(Math.random()*8)]
            }
            dispatch({rects: state.rects.concat([rect])})
        },
        toggleHidden(e){
            console.info("toggleHidden",umsKey)
            dispatch({hidden: !state.hidden})
        }
    }),{rects: [], hidden: false},umsKey)

    useDoubleClick({
        onSingleClick: methods.addRect,
        onDoubleClick: methods.toggleHidden,
        ref: buttonRef,
        latency: 250
    })

    return (
        <>
            <div ref={buttonRef} style={{...rect, position: 'absolute', cursor: 'pointer', backgroundColor: state.hidden?'dark'+rect.backgroundColor:rect.backgroundColor}}  key={Object.values(rect).join('-')} >
            </div>
            {!state.hidden && state.rects.map((rect,i)=> 
                <Component rect={rect} {...methods.keys(Object.values(rect).join('-'))} />
                )
            }
        </>
    )
}
const Name = 'useMethods'

export default {
  title: Name,
  component: Component,
  argTypes: {},
}

const Template = args => {
  return (
    <div style={{ width: 'calc(100vw - 2rem)', minHeight: 'calc(100vh - 2rem)' }}>
      <div
        style={{
          width: '48em',
          marginLeft: 'auto',
          marginRight: 'auto',
          textAlign: 'center',
          padding: '1rem',
          backgroundColor: '#fff',
          minHeight: 'calc(100vh - 2rem)',
          position: 'relative'
        }}
      >
        <Component key="1" rect={{top: 100, left: 100, width: 100, height: 100, backgroundColor: 'purple'}} />
      </div>
    </div>
  )
}

export const Normal = Template.bind({})
Normal.args = {}
