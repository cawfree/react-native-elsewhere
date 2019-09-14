import React from 'react';
import { Platform, View, StyleSheet, WebView } from 'react-native';
import PropTypes from 'prop-types';
import axios from 'axios';
import clean from 'htmlclean';

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
    onRequestRestore: PropTypes.func,
    onRequestPersist: PropTypes.func,
    onMessage: PropTypes.func,
    onPostMessage: PropTypes.func,
    scripts: PropTypes.arrayOf(PropTypes.string),
    Component: PropTypes.func,
  }
  static defaultProps = {
    engine: function(postMessage, data) {},
    uri: null,
    onRequestRestore: null,
    onRequestPersist: null,
    onMessage: data => null,
    onPostMessage: postMessage => null,
    scripts: [],
    Component: WebView,
  }
  static checksumEngine = (engine, scripts = []) => `${engine}${JSON.stringify(
    scripts,
  )}`;
  static getChecksumFor = uri => `${uri}.cs`;
  static fetchEngine = (engine, scripts = []) => Promise
    .resolve()
    .then(
      () => Promise
        .all(
          scripts
            .map(
              url => axios.get(url),
            ),
        ),
    )
    .then(
      responses => responses
        .map(
          ({ data }) => data,
        ),
    )
    .then(
      scripts => (
        scripts
          .reduce(
            (str, src) => (
              `${str}
                <script>
                  ${src}
                </script>
              `
            ),
            `
              <!doctype html>
              <html>
                <head>
                  <meta charset='utf-8'>
                  <title>Elsewhere</title>
                  <meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'>
                </head>
                <body>
            `,
          )
      ),
    )
    .then(
      header => (
        `
          ${header}
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
        `
      ),
    )
    .then(clean);
  constructor(nextProps) {
    super(nextProps);
    this.__onMessage = this.__onMessage.bind(this);
    this.__onLoadEnd = this.__onLoadEnd.bind(this);
    this.state = {
      //uri: undefined,
      //html: undefined,
    };
  }
  componentDidMount() {
    const {
      uri,
      engine,
      scripts,
      onRequestPersist,
      onRequestRestore,
    } = this.props;
    const now = new Date().getTime();
    return Promise
      .resolve()
      .then(
        () => {
          if (!!uri && typeof onRequestRestore === 'function') {
            return Promise
              .all(
                [
                  onRequestRestore(uri),
                  onRequestRestore(
                    Elsewhere
                      .getChecksumFor(
                        uri,
                      ),
                  ),
                ],
              )
              .then(
                ([ cachedEngine, checksum ]) => {
                  if (typeof cachedEngine === 'string' && typeof checksum === 'string') {
                    const existingChecksum = Elsewhere
                      .checksumEngine(
                        engine,
                        scripts,
                      );
                    // TODO: should be of the actual file contents (checksum the file?)
                    if (existingChecksum === checksum) {
                      return Promise  
                        .resolve(
                          cachedEngine,
                        );
                    }
                    return Promise
                      .reject(
                        `The current elsewhere is outdated.`,
                      );
                  }
                  return Promise
                    .reject(
                      new Error(
                        `Failed to rebuild Elsewhere from existing resources.`,
                      ),
                    );
                },
              )
              .catch((e) => {
                console.warn(e);
                return null;
              });
          }
          return Promise    
            .resolve(
              null,
            );
        },
      )
      .then(
        (cachedEngine) => {
          if (typeof cachedEngine !== 'string') {
            return Elsewhere
              .fetchEngine(
                engine,
                scripts,
              )
              .then(
                (data) => {
                  if (!!uri && typeof onRequestRestore === 'function') {
                    return Promise
                      .all(
                        [
                          onRequestPersist(
                            data,
                            uri,
                          ),
                          onRequestPersist(
                            Elsewhere
                              .checksumEngine(
                                engine,
                                scripts,
                              ),
                            Elsewhere
                              .getChecksumFor(
                                uri,
                              ),
                          ),
                        ],
                      )
                      .then(
                        () => ({
                          uri,
                        }),
                      );
                  }
                  return Promise
                    .resolve(
                      {
                        html: data,
                      },
                    );
                },
            );
          }
          return {
            uri,
          };
        },
      )
      .then(({ html, uri }) => this.setState({
        uri,
        html,
      }));
  }
  __onLoadEnd(e) {
    // XXX: Prevent delegation; enforce client to use onPostMessage as the initialization hook.
    //const { onLoadEnd } = this.props;
    //if (onLoadEnd) {
    //  onLoadEnd(e);
    //}
  }
  __onMessage(e) {
    const {
      onMessage,
    } = this.props;
    const receivedData = e.nativeEvent.data || '{}';
    const data = JSON.parse(
      // XXX: iOS double-encodes returned data!
      Platform.OS === 'ios' ? decodeURIComponent(decodeURIComponent(receivedData)) : receivedData,
    );
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
      Component,
      ...extraProps
    } = this.props;
    const {
      html,
      uri: persistedUri,
      ...extraState
    } = this.state;
    const hasPersistedUri = (!!persistedUri) && (uri === persistedUri);
    const source = hasPersistedUri ? {
      uri: `${Platform.OS !== 'ios' ? 'file://' : ''}${persistedUri}`,
    } : { html };
    const conditionalProps = (!!persistedUri || !!html) ? { source } : {};
    // XXX: In order to read a persisted uri, we must allowFileAccess. Otherwise if we're
    //      using the engine directly, we don't need this property.
    return (
      <View
        pointerEvents="none"
        style={styles.container}
      >
        <Component
          ref="engine"
          {...extraProps}
          {...conditionalProps}
          originWhitelist={['*']}
          onMessage={this.__onMessage}
          allowFileAccess={hasPersistedUri}
          onLoadEnd={this.__onLoadEnd}
        />
      </View>
    );
  }
}
