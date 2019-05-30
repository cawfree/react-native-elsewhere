import React from 'react';
import { Platform, View, StyleSheet, WebView } from 'react-native';
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
    uri: PropTypes.string,
    onRequestPersist: PropTypes.func,
    onMessage: PropTypes.func,
    onPostMessage: PropTypes.func,
    scripts: PropTypes.arrayOf(PropTypes.string),
  }
  static defaultProps = {
    engine: function(postMessage, data) {},
    uri: null,
    onRequestPersist: null,
    onMessage: data => null,
    onPostMessage: postMessage => null,
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
        <script>
          // XXX: https://github.com/facebook/react-native/issues/11594#issuecomment-298850709
          function awaitPostMessage() {
            var isReactNativePostMessageReady = !!window.originalPostMessage;
            var queue = [];
            var currentPostMessageFn = function store(message) {
              if (queue.length > 100) queue.shift();
              queue.push(message);
            };
            if (!isReactNativePostMessageReady) {
              var originalPostMessage = window.postMessage;
              Object.defineProperty(
                window,
                'postMessage',
                {
                  configurable: true,
                  enumerable: true,
                  get: function () {
                    return currentPostMessageFn;
                  },
                  set: function (fn) {
                    currentPostMessageFn = fn;
                    isReactNativePostMessageReady = true;
                    setTimeout(sendQueue, 0);
                  },
                },
              );
              window.postMessage.toString = function () {
                return String(originalPostMessage);
              };
            }
            function sendQueue() {
              while (queue.length > 0) window.postMessage(queue.shift());
            }
          }
          awaitPostMessage();
          window.postMessage(JSON.stringify(
            {
              __elsewhere: true,
            },
          ));
        </script>
      </body>
    </html>
  `;
  constructor(nextProps) {
    super(nextProps);
    this.__onMessage = this.__onMessage.bind(this);
    this.__onLoadEnd = this.__onLoadEnd.bind(this);
    const {
      uri,
      engine,
      scripts,
    } = nextProps;
    this.state = {
      uri: null,
      html: Elsewhere.wrapEngine(
        engine,
        scripts,
      ),
    };
    if (uri) {
      const {
        onRequestPersist,
      } = nextProps;
      if (!onRequestPersist) {
        throw new Error(
          `Callers must implement the the onRequestPersist prop in order to serialize the engine at the specified uri, "${uri}".`,
        );
      }
      const {
        html,
      } = this.state;
      this.__attemptPersistence(
        html,
        uri,
        onRequestPersist,
      );
    }
  }
  __attemptPersistence(html, uri, onRequestPersist) {
    return Promise.resolve()
      .then(() => onRequestPersist(
        html,
        uri,
      ))
      .then(() => this.setState({ uri }));
  }
  __onLoadEnd() {
    
  }
  __onMessage(e) {
    const {
      onMessage,
    } = this.props;
    const data = JSON.parse(e.nativeEvent.data || '{}');
    const {
      __elsewhere,
    } = data;
    // XXX: When postMessage is ready, defer to the caller.
    if (__elsewhere) {
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
    } else if (onMessage) {
      onMessage(data);
    }
  }
  render() {
    const {
      uri,
      engine,
      onMessage,
      onPostMessage,
      scripts,
      ...extraProps
    } = this.props;
    const {
      html,
      uri: persistedUri,
      ...extraState
    } = this.state;
    // XXX: If a uri hasn't been specified, we can render the content immediately.
    //      Otherwise, we must wait until the resource has been persisted before rendering.
    const source = (!uri) ? { html } : { uri: persistedUri ? (Platform.OS === 'ios' ? persistedUri : `file://${persistedUri}`) : null};
    // XXX: In order to read a persisted uri, we must allowFileAccess. Otherwise if we're
    //      using the engine directly, we don't need this property.
    const allowFileAccess = (!!uri);
    return (
      <View
        pointerEvents="none"
        style={styles.container}
      >
        <WebView
          ref="engine"
          {...extraProps}
          source={source}
          originWhitelist={['*']}
          onMessage={this.__onMessage}
          allowFileAccess={allowFileAccess}
        />
      </View>
    );
  }
}
