import React, { useState, useReducer, useEffect, useCallback } from "react"
import { cloneDeep, isEqual } from "lodash"

// const [state,methods]=useMethodHistory(methodsObject, umhKey, initialState, deps)
//
// usmKeys need to be drilled down through components that lie between component that involve useMethods
// if you don't pass a umhKey - one will be assigned - but if the user backs past that state, it won't be restoreable when going forward - and neither will the children
// !!! need to do work to delete the children in that case

// while "object" state  (a pointer for you C programmers) will change each time, the object state.methodState (meaning the pointer methodState) will always be the same
// this reducer will mutate the contents of the methodState object based on the properties in the object "action'.  So action does not have a type like it would in usual cases.
// reducer will retun a new state but with the same methodState object - though it will be mutated
function reducer(state, action) {
    Object.assign(state.methodState, action)
    // after react settles, push the current state onto history
    if (typeof window !== "undefined" && !useMethodsHistory.inPopState) {
        if (useMethodsHistory.timeout) clearTimeout(useMethodsHistory.timeout)
        useMethodsHistory.timeout = setTimeout(() => {
            requestAnimationFrame(useMethodsHistory.pushState)
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

const addCommonMethods = (_this, methodsObj, initialState) => {
    let methods = methodsObj(_this.dispatch, _this.methodState)
    methods.reset = function () {
        // reset the methodState back to initialState by mutating the original object.
        // don't create a new object, becasue the methosObjs were instantiated to work with the original state.methodState object.
        Object.keys(_this.methodState).forEach(key => {
            delete _this.methodState[key]
        })
        Object.assign(_this.methodState, initialState)
        _this.dispatch({})
    }

    // <Component {...methods.keys(key)} ... > will get you the key for your component and the usmKey for the child
    methods.keys = function (key) {
        key = key + "" // it could be 0 make sure it's a string
        return { key, umhKey: key ? _this.umhKey + "." + key : undefined }
    }

    methods.setState = function (newState) {
        _this.dispatch(newState)
    }
    return methods
}

export function useMethodsHistory(methodsObj, initialState, umhKey, deps = []) {
    // the thing about the umhKey is that it needs to be unique accross the application running on the browser
    // but it should be the same if the user goes backward in history and then forward again - this is how we will find the state and reuse that state when the user moves forward after a component was unmounted
    // umhKey is optional but then you won't get the go forward capability

    const [_this] = useState(() => {
        // stuff in here will only run then the Component is run the first time
        // we want as much as we can in here so we don't run it every time the parent of this rerenders
        let startState = initialState
        // if there is a umhKey and we find a match in children, get the current state from that child
        if (typeof window !== "undefined" && umhKey) {
            for (const child of useMethodsHistory.children) {
                if (child.umhKey === umhKey) {
                    if (child.unmounted) {
                        startState = child.methodState
                        useMethodsHistory.children.delete(child)
                        break
                    } else {
                        console.error("useMethods umhKey:", umhKey, "new call but child exists with same key")
                    }
                }
            }
        }
        return {
            umhKey:
                umhKey ||
                (typeof window !== "undefined"
                    ? !useMethodsHistory.children.size
                        ? "umh-top"
                        : "umh__" + useMethodsHistory.nextUniqueumhKey++
                    : "umh-server__" + useMethodsHistory.nextUniqueumhKey++),
            methodState: cloneDeep(startState),
            dispatch: undefined,
            unmounted: false,
        }
    }) // never set _this

    const [state, dispatch] = useReducer(reducer, { methodState: _this.methodState })
    // useReducer returns a new pointer to "state" every time state changes, but it always returns the same value for dispatch

    if (state.methodState !== _this.methodState)
        throw Error(
            "useMethods state.methodState was not identical to _this.methodState",
            state,
            _this,
            "Probably React has changed"
        )

    if (!_this.dispatch) {
        _this.dispatch = dispatch
        if (typeof window !== "undefined") useMethodsHistory.children.add(_this)
    }

    // methodsObj is a function that returns an object of methods - because we need to pass dispatch to it.  Passing methodState doesn't hurt
    // addCommonMethods puts in a few common methods
    const methods = useCallback(addCommonMethods(_this, methodsObj, initialState), deps) // dispatch and methodState aren't in deps because they never change

    useEffect(() => {
        if (typeof window !== "undefined")
            if (history.state.key !== "useMethods") {
                // on the server there is no history
                // this is the first time through
                if (useMethodsHistory.timeout) clearTimeout(useMethodsHistory.timeout)
                useMethodsHistory.timeout = setTimeout(() => {
                    requestAnimationFrame(useMethodsHistory.replaceState)
                })
            }
        return () => {
            _this.unmounted = true
            //!! if unmounting with an autogenerated umhKey then delete it
            if (typeof window !== "undefined" && _this.umhKey.startsWith("umh__"))
                useMethodsHistory.children.delete(_this)
        }
    }, [])

    return [_this.methodState, methods]
}

useMethodsHistory.nextUniqueumhKey = 1

if (typeof window !== "undefined") {
    useMethodsHistory.inPopState = false
    useMethodsHistory.timeout = 0
    useMethodsHistory.children = new Set()
    useMethodsHistory.pushState = () => {
        let stateStack = []
        useMethodsHistory.children.forEach(child =>
            stateStack.push({ umhKey: child.umhKey, methodState: cloneDeep(child.methodState) })
        )
        history.pushState({ key: "useMethods", stateStack }, null)
    }
    useMethodsHistory.replaceState = () => {
        let stateStack = []
        useMethodsHistory.children.forEach(child =>
            stateStack.push({ umhKey: child.umhKey, methodState: cloneDeep(child.methodState) })
        )
        history.replaceState({ key: "useMethods", stateStack }, null)
    }
    function updateChidrenFromStateStack(stateStack, i) {
        for (const child of useMethodsHistory.children) {
            if (i >= stateStack.length) break
            if (child.umhKey === stateStack[i].umhKey) {
                if (!isEqual(child.methodState, stateStack[i].methodState)) {
                    console.info("onpop updating child", child.umhKey)
                    if (child.unmounted) {
                        console.info("onpopstate child unmounted, assign without dispatch", child.umhKey)
                        Object.assign(child.methodState, cloneDeep(stateStack[i].methodState))
                    } else child.dispatch(stateStack[i].methodState)
                }
            } else {
                continue
            }
            ++i
        }
        return i
    }
    window.onpopstate = event => {
        useMethodsHistory.inPopState = true
        if (event.state && event.state.key === "useMethods") {
            let i = 0
            const stateStack = event.state.stateStack
            let newI = updateChidrenFromStateStack(stateStack, i)
            // the order of components in children might not be the order in stateStack
            // because the children are a set - we can only iterate through them linearly
            // if there are states that have not been restored yet, try again
            // but don't get caught in a loop
            while (newI < stateStack.length && newI > i) {
                i = newI
                newI = updateChidrenFromStateStack(stateStack, i)
            }
            if (newI < stateStack.length) console.error("onpop not all states applied", i, "of", stateStack.length)
        }
        useMethodsHistory.inPopState = false
    }
}

export default useMethodsHistory
