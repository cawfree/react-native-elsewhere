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
    scripts: PropTypes.arrayOf(PropTypes.string),
  }
  static defaultProps = {
    onMessage: data => null,
    onPostMessage: postMessage => null,
    engine: function(postMessage, data) {},
    scripts: [],
  }
  static wrapEngine = (engine, scripts = []) => `
    <!doctype html>
    <html>
      <head>
        <meta charset='utf-8'>
        <title>Elsewhere</title>
        <meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'>
      </head>
      <body>
        ${scripts.map(script => `<script src="${script}"></script>`).join('\n')}
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
      onMessage,
      onPostMessage,
      scripts,
      ...extraProps
    } = this.props;
    return (
      <View
        pointerEvents="none"
        style={styles.container}
      >
        <WebView
          ref="engine"
          {...extraProps}
          source={{
            html: Elsewhere.wrapEngine(engine, scripts),
          }}
          originWhitelist={['*']}
          onMessage={this.__onMessage}
        />
      </View>
    );
  }
}
