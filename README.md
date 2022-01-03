# useMethodsHistory( functionThatReturnsObjectOfMethods, initialState, umkKey, dependencies )

There are many implementations of useMethods - this differes from some of them because
the function that declares the methods can be declared within the react component, and it can use props without
causing unnecessary rerendering or unexpected firing of methods.

## functionThatReturnsObjectOfMethods( state, dispatch )

### state

the object representing the current state

### dispatch (new state)

the function to call with the new state keys. No need to do {...state, key: 'value'} becuase the ...state will be taken care of in the dispatch

```
function (state,dispatch){
    return {
        method1(p1,p2,...) {
            dispatch({key: 'value'})
        },
        method2() {
            dispatch({key2: 'value'})
        }
    }
}
```

## umhKey

A unique string to use as a key. For the top use, the key should be unique across all projects on the browser. For each child, a repeatable but unique key should be passed. Repetable meaning that if the user went back in history and then forward again - that key would be the same. For example, the id of a database records.

## dependencies

An Array of variables, if one of these variable changes, the functionThatReturnsObjectOfMethods will be re-memoized (with the new values of the variables)
By default this is [], meaning never re-memoize the function

## returns [state, methods]

use-methods returns an array containing state, and methods. The array returned will change whenever there is a change within state or methods.

-   `state` can not be used to determine if there is a change within state from a previous value of state. If you want to pass something as a prop to a child function and cause a rerender on changes in state, pass the array. Methods don't have to be pure functions, it's up to the implementation. An example would be a method that saves a value in state, and makes an api call to write it to a database.

```js
    // bad - DisplaySomething will never re-render on a state change
    const [state,methods]=useMethodsHistory((state,dispatch)=>{...}, {key: value}, [])
    return <DisplaySomething state={state} ... >
```

```js
    // this works
    const countOM=useMethodsHistory((state,dispatch)=>{...}, {key: value}, [])
    return <DisplaySomething countOM={countOM} ... >

```

And typically, if you are passing state to a child component you will also want to pass methods so the child can operate on the state.

-   `methods` will only change if there is a change in `deps`

### methods.keys(uniqueKey)

When rendering a child, this will return (key, umhKey) to create a unique key for the child that is tied to its ancestors

```
<Child {...methods.keys('uniqueKey')} {...otherprops} />
```

### methods.reset()

resets the state of the component to the InitialState

### methods.setState({key: val, key2: val2, ...})

like the traditional setState of ReactClasses this allows you to set the state directly rather than create a methods - but methods are probably more descriptive

## Example

```js
import useMethodsHistory from "../use-methods-history"

function DisplayCount( props ) {
    const { umhKey, countBy } = props

    const [state, methods] = useMethodsHistory(
        (dispatch, state) => ({
            increment() {
                dispatch({ count: state.count + countBy })
            },
        }),
        { count: 0 },
        umhKey,
        [props.countBy]
    )

    return (
        <div>
            <div>Count:{state.count}</div>
            <div>
                <button onClick={methods.increment}>methods.increment</button>
            </div>
            <div>
                <button onClick={() => methods.setState({ count: state.count + countBy })}>methods.setState</button>
            </div>
            <div>
                <button onClick={methods.reset}>method.reset</button>
            </div>
        </div>
    )

ReactDom.render(<DisplayCount umhKey={"DisplayCountDemo"} countBy={2}>, getElementById('root'))
```

In the above example, `functionThatReturnsObjectOfMethods` depends on a prop, and so it has to be delcared within DisplayCount, and still works efficiently.
