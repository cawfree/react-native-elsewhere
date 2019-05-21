import React from 'react';
import { View, Alert, StyleSheet, WebView } from 'react-native';
import PropTypes from 'prop-types';

import escape from 'js-string-escape';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
});

export default class Elsewhere extends React.Component {
  static propTypes = {
    engine: PropTypes.func,
    onMessage: PropTypes.func,
    onPostMessage: PropTypes.func,
  }
  static defaultProps = {
    onMessage: data => Alert.alert(JSON.stringify(data)),
    onPostMessage: (postMessage) => {
      setTimeout(
        () => {
          postMessage({
            hello: 'world',
          });
        },
        100,
      );
    },
    // TODO: enforce callers to conform to this implementation
    engine: function(postMessage, data) {
      postMessage(data);
    },
  }
  static wrapEngine = engine => `
    <!doctype html>
    <html>
      <head>
        <meta charset='utf-8'>
        <title>Elsewhere</title>
        <meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'>
      </head>
      <body>
        <script>
          window.engine = ${engine.toString()};
        </script>
      </body>
    </html>
  `;
  constructor(nextProps) {
    super(nextProps);
    this.__onMessage = this.__onMessage.bind(this);
  }
  componentDidMount() {
    const {
      onPostMessage,
    } = this.props;
    if (onPostMessage) {
      onPostMessage(
        (data = {}) => this.refs.engine.injectJavaScript(
          `window.engine((data => window.postMessage(JSON.stringify(data))), ${JSON.stringify(data)});`,
        ),
      );
    }
  }
  __onMessage(e) {
    const {
      onMessage,
    } = this.props;
    const data = JSON.parse(e.nativeEvent.data || '{}');
    if (onMessage) {
      onMessage(data);
    }
  }
  render() {
    const {
      engine,
    } = this.props;
    return (
      <View
        pointerEvents="none"
        style={styles.container}
      >
        <WebView
          ref="engine"
          source={{
            html: Elsewhere.wrapEngine(engine),
          }}
          originWhitelist={['*']}
          onMessage={this.__onMessage}
        />
      </View>
    );
  }
}
