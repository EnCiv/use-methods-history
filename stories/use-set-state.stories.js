import { React, useState, useRef } from 'react'
import useMethods from '../use-methods'



const Component = props =>{
    const {umsKey, countBy}=props

    const [state,methods]=useMethods((dispatch,state)=>({
        increment() {
            dispatch({count: state.count + countBy})
        }
    }),{count: 0},umsKey,[props.countBy])

    return (
        <div>
            <div>Count:{state.count}</div>
            <div><button onClick={methods.increment}>methods.increment</button></div>
            <div><button onClick={()=>methods.setState({count: state.count+countBy})}>methods.setState</button></div>
            <div><button onClick={methods.reset}>method.reset</button></div>
        </div>
    )
}
const Name = 'CountBy'

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
        <Component key="1" {...args} />
      </div>
    </div>
  )
}

export const Normal = Template.bind({})
Normal.args = { umsKey: 'CountBy', countBy: 2}
