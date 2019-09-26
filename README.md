# react-native-elsewhere
Ridiculously simple React Native thread unblocking.

## 🚀 Getting Started
Using [npm](https://www.npmjs.com/package/@cawfree/react-native-elsewhere):
```shell
npm install --save @cawfree/react-native-elsewhere
```
Using [yarn](https://www.npmjs.com/package/@cawfree/react-native-elsewhere):
```shell
yarn add @cawfree/react-native-elsewhere
```
Yeah, no linking. 👍

## ⚙ How does it work?
By delegating stateless JavaScript computation to a [`<WebView />`](https://facebook.github.io/react-native/docs/webview), your app can maintain responsive whilst you crunch through heavy computation in the background.

```javascript
import React, {Component} from 'react';
import {WebView, Button, Platform, StyleSheet, Text, View, Alert} from 'react-native';

import Elsewhere from '@cawfree/react-native-elsewhere';

// https://gist.github.com/sqren/5083d73f184acae0c5b7
function doSomethingIntense(postMessage, { source }) {
  const now = new Date();
  let result = 0;   
  for (var i = Math.pow(10, 7); i >= 0; i--) {      
    result += Math.atan(i) * Math.tan(i);
  };
  postMessage({
    source,
    result,
    dt: new Date().getTime() - now.getTime(),
  });
}

type Props = {};
export default class App extends Component<Props> {
  state = {
    postMessage: () => null,
  }
  render() {
    const {
      postMessage,
    } = this.state;
    return (
      <View style={styles.container}>
        <Elsewhere
          WebView={WebView}
          engine={doSomethingIntense}
          onMessage={data => Alert.alert(JSON.stringify(data))}
          onPostMessage={(postMessage) => {
            this.setState({
              postMessage,
            });
          }}
        />
        <Text style={styles.welcome}>Welcome to React Native!</Text>
        <Text style={styles.instructions}>To get started, open the debug menu and enable the performance monitor so we can watch the JS frame rate.</Text>
        <Text style={styles.instructions}>It should read a steady 60fps. ⏰ </Text>
        <Text style={styles.instructions}>{'🤓'}</Text>
        <Text style={styles.instructions}>Tap the Button below to watch your frame rate plummet! 📉 </Text>
        <View
          style={{
            padding: 10,
          }}
        >
          <Button
            title="Run on JS thread"
            style={styles.button}
            onPress={() => doSomethingIntense(
              (data) => Alert.alert(JSON.stringify(data)),
              { source: 'ui' },
            )}
          />
        </View>
        <Text style={styles.instructions}>Intense, right? Now run the exact same operation inside of an Elsewhere. 📈 </Text>
        <View
          style={{
            padding: 10,
          }}
        >
          <Button
            title="Run on Elsewhere"
            style={styles.button}
            onPress={() => postMessage(
              { source: 'web' },
            )}
          />
        </View>
        <Text>See how the frame rate stays at 60? Magic. 🔮 </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  button: {
    marginBottom: 15,
  }
});
```

## 💾 Persistence
Using the `scripts` prop, it is possible to define an array of urls that you'd like to import as `<script/>`s within your JavaScript logic. Some scripts you call to may rely on localStorage for persistence between launches of your application; however for this to work successfully, your `engine` will need to be serialized to a file location so that thr browser can associate stored data with a given file `uri`.

This can be achieved using the following, which uses [`react-native-fs`](https://github.com/itinance/react-native-fs) as the file I/O utility.

```javascript
import React from 'react';
import Elsewhere from '@cawfree/react-native-elsewhere';
import fs from 'react-native-fs';

// XXX: Declare a uri where we'd like to store the evaluated
//      engine on the device file system.
const uri = `${fs.CachesDirectoryPath}/elsewhere.html`;

export default class Persisted extends React.Component {
  render() {
    return (
      <Elsewhere
        engine={engine}
        uri={uri}
        scripts={[
          // XXX: for example, you could use lokijs as a persistent database!
          'https://rawgit.com/techfort/LokiJS/master/src/lokijs.js',
          'https://rawgit.com/techfort/LokiJS/master/src/loki-indexed-adapter.js',
          // XXX: or you could make lodash available to your engine
          'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/1.2.1/lodash.min.js',
        ]}
        onRequestPersist={(html, url) => {
          // XXX: You must return a Promise, which when reslved guarantees
          //      that the engine html has been saved to the requested uri.
          return fs.writeFile(
            url,
            html,
          );
        }}
      />
    );
  }
}
```

## ✌️ License
[MIT](https://opensource.org/licenses/MIT)
