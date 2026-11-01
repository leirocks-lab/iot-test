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
          <div className={`${styles['section_1']} flex-col`}>
            <div className={`${styles['box_2']} flex-row`}>
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
                  require('./assets/img/28280e0496464bba90ed790941ceb73b_mergeImage.png')
                }
              />
              <span className={`${styles['text-group_1']}`}>添加设备</span>
            </div>
            <div className={`${styles['image-text_2']} flex-row justify-between`}>
              <img
                className={`${styles['label_2']}`}
                src={
                  require('./assets/img/SketchPngef6aa921089b9cbb655201eb8718461d630ad7b5aff1975daa5796d4104d5d48.png')
                }
              />
              <div className={`${styles['text-group_2']} flex-col`}>
                <span className={`${styles['text_2']}`}>正在扫描附近蓝牙设备</span>
                <span className={`${styles['text_3']}`}>请保持设备已接通电源，并在附近</span>
              </div>
            </div>
            <span className={`${styles['text_4']}`}>搜不到设备？手动添加</span>
            <span className={`${styles['text_5']}`}>风扇：</span>
            <div className={`${styles['box_3']} flex-row justify-between`}>
              <div className={`${styles['box_4']} flex-col`}>
                <div className={`${styles['image-text_3']} flex-col`}>
                  <div className={`${styles['image-wrapper_1']} flex-col`}>
                    <img
                      className={`${styles['label_3']}`}
                      src={
                        require('./assets/img/016752b70f944743b98e286444b2e174_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_3']} flex-col`}>
                    <span className={`${styles['text_6']}`}>AS1100</span>
                    <span className={`${styles['text_7']}`}>AStar</span>
                  </div>
                </div>
                <div className={`${styles['image-wrapper_2']} flex-row justify-between`}>
                  <img
                    className={`${styles['thumbnail_3']}`}
                    src={
                      require('./assets/img/SketchPng3cac662d3b44ba63850a3cf491a0b1e2e1a5f959794329252113314cca39bc79.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_4']}`}
                    src={
                      require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['box_5']} flex-col`}>
                <div className={`${styles['image-text_4']} flex-col`}>
                  <div className={`${styles['image-wrapper_3']} flex-col`}>
                    <img
                      className={`${styles['label_4']}`}
                      src={
                        require('./assets/img/12794567262a406fbab84688afc71436_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_4']} flex-col`}>
                    <span className={`${styles['text_8']}`}>AS1101</span>
                    <span className={`${styles['text_9']}`}>AStar</span>
                  </div>
                </div>
                <img
                  className={`${styles['thumbnail_5']}`}
                  src={
                    require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                  }
                />
              </div>
              <div className={`${styles['box_6']} flex-col`}>
                <div className={`${styles['image-text_5']} flex-col`}>
                  <div className={`${styles['image-wrapper_4']} flex-col`}>
                    <img
                      className={`${styles['label_5']}`}
                      src={
                        require('./assets/img/6dcd9756530c4dba8c41284a4529acaf_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_5']} flex-col`}>
                    <span className={`${styles['text_10']}`}>AS1102</span>
                    <span className={`${styles['text_11']}`}>AStar</span>
                  </div>
                </div>
                <div className={`${styles['image-wrapper_5']} flex-row justify-between`}>
                  <img
                    className={`${styles['thumbnail_6']}`}
                    src={
                      require('./assets/img/SketchPng3cac662d3b44ba63850a3cf491a0b1e2e1a5f959794329252113314cca39bc79.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_7']}`}
                    src={
                      require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                    }
                  />
                </div>
              </div>
            </div>
            <div className={`${styles['box_7']} flex-col`}>
              <div className={`${styles['image-text_6']} flex-col`}>
                <div className={`${styles['image-wrapper_6']} flex-col`}>
                  <img
                    className={`${styles['label_6']}`}
                    src={
                      require('./assets/img/0d63787e32644d0ca1b121c2357f55b5_mergeImage.png')
                    }
                  />
                </div>
                <div className={`${styles['text-group_6']} flex-col`}>
                  <span className={`${styles['text_12']}`}>AS1103</span>
                  <span className={`${styles['text_13']}`}>AStar</span>
                </div>
              </div>
              <img
                className={`${styles['thumbnail_8']}`}
                src={
                  require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                }
              />
            </div>
            <span className={`${styles['text_14']}`}>酒柜：</span>
            <div className={`${styles['box_8']} flex-row justify-between`}>
              <div className={`${styles['block_1']} flex-col`}>
                <div className={`${styles['image-text_7']} flex-col`}>
                  <div className={`${styles['image-wrapper_7']} flex-col`}>
                    <img
                      className={`${styles['label_7']}`}
                      src={
                        require('./assets/img/d36d44bcb76e487bb0a0465214a5fcb0_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_7']} flex-col`}>
                    <span className={`${styles['text_15']}`}>AS1100</span>
                    <span className={`${styles['text_16']}`}>AStar</span>
                  </div>
                </div>
                <div className={`${styles['image-wrapper_8']} flex-row justify-between`}>
                  <img
                    className={`${styles['thumbnail_9']}`}
                    src={
                      require('./assets/img/SketchPng3cac662d3b44ba63850a3cf491a0b1e2e1a5f959794329252113314cca39bc79.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_10']}`}
                    src={
                      require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                    }
                  />
                </div>
              </div>
              <div className={`${styles['block_2']} flex-col`}>
                <div className={`${styles['image-text_8']} flex-col`}>
                  <div className={`${styles['image-wrapper_9']} flex-col`}>
                    <img
                      className={`${styles['label_8']}`}
                      src={
                        require('./assets/img/bfaa7d62410f43569ae519b9d8773fe5_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_8']} flex-col`}>
                    <span className={`${styles['text_17']}`}>AS1101</span>
                    <span className={`${styles['text_18']}`}>AStar</span>
                  </div>
                </div>
                <img
                  className={`${styles['thumbnail_11']}`}
                  src={
                    require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                  }
                />
              </div>
            </div>
          </div>
          <img
            className={`${styles['image_2']}`}
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
