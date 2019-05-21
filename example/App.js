import React, {Component} from 'react';
import {Button, Platform, StyleSheet, Text, View, Alert} from 'react-native';

import Elsewhere from './Elsewhere';

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
