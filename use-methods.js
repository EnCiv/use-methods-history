import React, { useState, useReducer, useEffect, useCallback } from 'react'
import { cloneDeep, isEqual } from 'lodash'


// const [state,methods]=useMethodHistory(methodsObject, umsKey, initialState, deps)
//
// usmKeys need to be drilled down through components that lie between component that involve useMethods
// if you don't pass a umsKey - one will be assigned - but if the user backs past that state, it won't be restoreable when going forward - and neither will the children
// !!! need to do work to delete the children in that case

// while "object" state  (a pointer for you C programmers) will change each time, the object state.methodState (meaning the pointer methodState) will always be the same
// this reducer will mutate the contents of the methodState object based on the properties in the object "action'.  So action does not have a type like it would in usual cases.
// reducer will retun a new state but with the same methodState object - though it will be mutated 
function reducer(state, action) {
    Object.assign(state.methodState, action)
    // after react settles, push the current state onto history
    if(!useMethods.inPopState) {
        if(useMethods.timeout)
            clearTimeout(useMethods.timeout)
        useMethods.timeout=setTimeout(()=>{
            requestAnimationFrame(useMethods.pushState)
        })
    }
    return { ...state }
}

// this wrapper adds some common functions to methods, it's an external function so that it only needs to be called when deps changs.

// these methods (the code) are setup once. They will always refer to the original "state" pointer that was returned by the very first useReducer call.
// but because our "state" has "methodState" in it, and our reducer always mutates that object (rather then setting methodState= it uses objectAssign(methodState))
// these "memorized" methods will be able to access the latest *methodState* as it changes
// memorizing these methods saves times and reduces rerendering of components
// writing code with methods is less work and less error prone than doing dispatch({type: "xxx"}) everywhere

const addCommonMethods=(_this, methodsObj, initialState)=>{
    let methods=methodsObj(_this.dispatch, _this.methodState)
    methods.reset = function () {
        // reset the methodState back to initialState by mutating the original object.  
        // don't create a new object, becasue the methosObjs were instantiated to work with the original state.methodState object.
        Object.keys(methodState).forEach(key => { delete methodState[key] })
        Object.assign(methodState, initialState)
        dispatch({})
    }

    // <Component {...methods.keys(key)} ... > will get you the key for your component and the usmKey for the child
    methods.keys=function(key){
        return {key, umsKey: _this.umsKey ? _this.umsKey+'.'+key : undefined}
    }
    return methods
}


export function useMethods(methodsObj, initialState, umsKey, deps=[]) {

    // the thing about the umsKey is that it needs to be unique accross the application running on the browser
    // but it should be the same if the user goes backward in history and then forward again - this is how we will find the state and reuse that state when the user moves forward after a component was unmounted
    // umsKey is optional but then you won't get the go forward capability
   
    const [_this]=useState(()=>{
        // stuff in here will only run then the Component is run the first time
        // we want as much as we can in here so we don't run it every time the parent of this rerenders
        let startState=initialState
        // if there is a umsKey and we find a match in children, get the current state from that child
        if(umsKey) {
            for(const child of useMethods.children){
                if(child.umsKey===umsKey){
                    if(child.unmounted){
                        startState=child.methodState
                        useMethods.children.delete(child)
                        break
                    }
                    else {
                        console.error("useMethods umsKey:",umsKey,"new call but child exists with same key" )
                    }
                }
            }
        }
        return {
            umsKey: umsKey || (!useMethods.children.length? 'ums-top' : 'ums-'+useMethods.nextUniqueUmsKey++),
            methodState: cloneDeep(startState),
            dispatch: undefined,
            unmounted: false
        }
    }) // never set _this

    const [state, dispatch] = useReducer(reducer, { methodState: _this.methodState })
    // useReducer returns a new pointer to "state" every time state changes, but it always returns the same value for dispatch

    if(state.methodState !== _this.methodState) throw Error("useMethods state.methodState was not identical to _this.methodState",state,_this, "Probably React has changed")

    if(!_this.dispatch){
        _this.dispatch=dispatch
        useMethods.children.add(_this)
    }

    // methodsObj is a function that returns an object of methods - because we need to pass dispatch to it.  Passing methodState doesn't hurt
    // wrapMethods puts in a few common methods
    const methods = useCallback(addCommonMethods(_this, methodsObj, initialState ),deps) // dispatch and methodState aren't in deps because they never change

    useEffect(()=>{
        if(history.state.key!=='useMethods') { // this is the first time through
            if(useMethods.timeout)
                clearTimeout(useMethods.timeout)
            useMethods.timeout=setTimeout(()=>{
                requestAnimationFrame(useMethods.replaceState)
            })
        }
        return ()=>{
            _this.unmounted=true
            //!! if unmounting with an autogenerated umsKey then delete it, plus all its unmounted children -- probably async
        }
    },[])

    return [_this.methodState, methods]
}

useMethods.children=new Set()
useMethods.nextUniqueUmsKey=1
useMethods.inPopState=false
useMethods.timeout=0
useMethods.pushState=()=>{
    let stateStack=[]
    useMethods.children.forEach(child=>stateStack.push({umsKey: child.umsKey, methodState: cloneDeep(child.methodState)}))
    history.pushState({key: 'useMethods',stateStack},null)
}
useMethods.replaceState=()=>{
    let stateStack=[]
    useMethods.children.forEach(child=>stateStack.push({umsKey: child.umsKey, methodState: cloneDeep(child.methodState)}))
    history.replaceState({key: 'useMethods',stateStack},null)
}
if(typeof window !== 'undefined'){
    window.onpopstate=(event)=>{
        useMethods.inPopState=true;  
        if(event.state && event.state.key==='useMethods'){
            let i=0
            const stateStack=event.state.stateStack
            let newI=updateChidrenFromStateStack(stateStack,i)
            // the order of components in children might not be the order in stateStack
            // because the children are a set - we can only iterate through them linearly
            // if there are states that have not been restored yet, try again
            // but don't get caught in a loop
            while(newI<stateStack.length && newI>i){
                i=newI
                newI=updateChidrenFromStateStack(stateStack,i)
            }
            if(newI<stateStack.length) console.error("onpop not all states applied",i,'of',stateStack.length)
        }
        useMethods.inPopState=false
    }
}
function updateChidrenFromStateStack(stateStack,i){
    for (const child of useMethods.children){
        if(i>=stateStack.length) break
        if(child.umsKey===stateStack[i].umsKey){
            if(!isEqual(child.methodState,stateStack[i].methodState)){
                console.info("onpop updating child",child.umsKey)
                if(child.unmounted) {
                    console.info("onpopstate child unmounted, assign without dispatch",child.umsKey)
                    Object.assign(child.methodState,cloneDeep(stateStack[i].methodState))
                }else
                    child.dispatch(stateStack[i].methodState)
            }
        } else {
            continue
        }
        ++i
    }
    return i
}

export default useMethods


