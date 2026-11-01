'use strict';

import React, { Component } from 'react';
import { Switch, NavBar, Checkbox, Radio, Input, Tabs, TabBar, Badge } from 'antd-mobile';

import styles from './assets/index.module.css';

const print = function (value) {};
class DDS_lanhupage_0 extends Component {
  state = {};
  setValue(val) {}
  render() {
    return (
      <div className={`${styles.page} flex-col`}>
        <div className={`${styles['box_1']} flex-row`}>
          <div className={`${styles['box_2']} flex-col`}>
            <div className={`${styles['box_3']} flex-row`}>
              <span className={`${styles['text_1']}`}>9:28</span>
              <img
                className={`${styles['thumbnail_1']}`}
                src={
                  require('./assets/img/SketchPng360cf53083fb4b7bdea1e78734ed0046dca74d03826eaf3e4459ecbbbcbb934b.png')
                }
              />
              <img
                className={`${styles['thumbnail_2']}`}
                src={
                  require('./assets/img/SketchPng235df50f2b085e0bf6a1a7e49c9ea1a58d746459a3f2f1698b7785dd734e9548.png')
                }
              />
              <img
                className={`${styles['image_1']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['image-text_1']} flex-row justify-between`}>
              <img
                className={`${styles['label_1']}`}
                src={
                  require('./assets/img/f09cee0f337e40a1bcb2f23aae6aa068_mergeImage.png')
                }
              />
              <span className={`${styles['text-group_1']}`}>添加设备</span>
            </div>
            <div className={`${styles['text-group_2']} flex-col`}>
              <span className={`${styles['text_2']}`}>正在扫描附近蓝牙设备</span>
              <span className={`${styles['text_3']}`}>请保持设备已接通电源，并在附近</span>
            </div>
            <img
              className={`${styles['image_2']}`}
              src={
                require('./assets/img/SketchPnge2ad47ff6331372228aab59ce79187ec1fd35872a945008c0b9144348451965f.png')
              }
            />
            <span className={`${styles['text_4']}`}>搜不到设备？手动添加</span>
            <span className={`${styles['text_5']}`}>风扇：</span>
            <div className={`${styles['list_1']} flex-row`}>
              <div className={`${styles['list-items_1-0']} flex-col`}>
                <div className={`${styles['image-text_2-0']} flex-col`}>
                  <div className={`${styles['image-wrapper_1-0']} flex-col`}>
                    <img
                      className={`${styles['label_2-0']}`}
                      src={
                        require('./assets/img/dade25bb7b314200b4a7a6b72f2bccb5_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_3-0']} flex-col`}>
                    <span className={`${styles['text_6-0']}`}>AS1100</span>
                    <span className={`${styles['text_7-0']}`}>AStar</span>
                  </div>
                </div>
                <div className={`${styles['image-wrapper_2-0']} flex-row justify-between`}>
                  <img
                    className={`${styles['thumbnail_4-0']}`}
                    src={
                      require('./assets/img/SketchPng3cac662d3b44ba63850a3cf491a0b1e2e1a5f959794329252113314cca39bc79.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_5-0']}`}
                    src={
                      require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['list-items_1-1']} flex-col`}>
                <div className={`${styles['image-text_2-1']} flex-col`}>
                  <div className={`${styles['image-wrapper_1-1']} flex-col`}>
                    <img
                      className={`${styles['label_2-1']}`}
                      src={
                        require('./assets/img/53388602fe234e5d8edb3e6acef5f4a4_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_3-1']} flex-col`}>
                    <span className={`${styles['text_6-1']}`}>AS1101</span>
                    <span className={`${styles['text_7-1']}`}>AStar</span>
                  </div>
                </div>
                <img
                  className={`${styles['thumbnail_3-1']}`}
                  src={
                    require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                  }
                />
              </div>
              <div className={`${styles['list-items_1-2']} flex-col`}>
                <div className={`${styles['image-text_2-2']} flex-col`}>
                  <div className={`${styles['image-wrapper_1-2']} flex-col`}>
                    <img
                      className={`${styles['label_2-2']}`}
                      src={
                        require('./assets/img/ab90b14a8ae84fdcbe973fa1217bba28_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_3-2']} flex-col`}>
                    <span className={`${styles['text_6-2']}`}>AS1102</span>
                    <span className={`${styles['text_7-2']}`}>AStar</span>
                  </div>
                </div>
                <div className={`${styles['image-wrapper_2-2']} flex-row justify-between`}>
                  <img
                    className={`${styles['thumbnail_4-2']}`}
                    src={
                      require('./assets/img/SketchPng3cac662d3b44ba63850a3cf491a0b1e2e1a5f959794329252113314cca39bc79.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_5-2']}`}
                    src={
                      require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                    }
                  />
                </div>
              </div>
            </div>
            <div className={`${styles['box_4']} flex-col`}>
              <div className={`${styles['image-text_3']} flex-col`}>
                <div className={`${styles['image-wrapper_3']} flex-col`}>
                  <img
                    className={`${styles['label_3']}`}
                    src={
                      require('./assets/img/3fa8f95fd4044ab59c9ec6abcecec249_mergeImage.png')
                    }
                  />
                </div>
                <div className={`${styles['text-group_4']} flex-col`}>
                  <span className={`${styles['text_8']}`}>AS1103</span>
                  <span className={`${styles['text_9']}`}>AStar</span>
                </div>
              </div>
              <img
                className={`${styles['thumbnail_6']}`}
                src={
                  require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                }
              />
            </div>
          </div>
          <img
            className={`${styles['image_3']}`}
            src={
              require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
            }
          />
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
