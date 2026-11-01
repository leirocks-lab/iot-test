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
        <div className={`${styles['group_1']} flex-row`}>
          <div className={`${styles['group_2']} flex-col`}>
            <div className={`${styles['group_3']} flex-row`}>
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
                  require('./assets/img/dc0558d2b28347f6852062b56b4b498b_mergeImage.png')
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
                <div className={`${styles['text-wrapper_1']}`}>
                  <span className={`${styles['text_2']}`}>发现设备</span>
                  <span className={`${styles['text_3']}`}>2</span>
                </div>
                <span className={`${styles['text_4']}`}>请保持设备已接通电源，并在附近</span>
              </div>
            </div>
            <div className={`${styles['list_1']} flex-col`}>
              <div className={`${styles['image-text_3-0']} flex-row`}>
                <div className={`${styles['box_1-0']} flex-col`}>
                  <img
                    className={`${styles['image_2-0']}`}
                    src={
                      require('./assets/img/SketchPng3613bbe3921f220f55f9f51d0ec47e2427bbd8b8a44ce8e6ac9fa58b1aa4ad73.png')
                    }
                  />
                  <div className={`${styles['box_2-0']} flex-col`} />
                </div>
                <div className={`${styles['text-group_4-0']} flex-col`}>
                  <span className={`${styles['text_8-0']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_9-0']}`}>RW-400PRO</span>
                  <span className={`${styles['text_10-0']}`}>SN.:&nbsp;R26073100012607310001</span>
                </div>
              </div>
              <div className={`${styles['image-text_3-1']} flex-row`}>
                <div className={`${styles['box_1-1']} flex-col`}>
                  <img
                    className={`${styles['image_2-1']}`}
                    src={
                      require('./assets/img/SketchPng3613bbe3921f220f55f9f51d0ec47e2427bbd8b8a44ce8e6ac9fa58b1aa4ad73.png')
                    }
                  />
                  <div className={`${styles['box_2-1']} flex-col`} />
                </div>
                <div className={`${styles['text-group_3-1']} flex-col`}>
                  <span className={`${styles['text_5-1']}`}>Air&nbsp;Conditioner</span>
                  <span className={`${styles['text_6-1']}`}>RW-400PRO</span>
                  <span className={`${styles['text_7-1']}`}>MAC.:&nbsp;R26073100012607310001</span>
                </div>
                <div className={`${styles['box_3-1']} flex-col`}>
                  <div className={`${styles['block_1-1']} flex-col`} />
                  <img
                    className={`${styles['image_3-1']}`}
                    src={
                      require('./assets/img/SketchPng092e43881516f53a81fef4a1dc57982b818f219b84723c0c6443d4c219dfd067.png')
                    }
                  />
                </div>
              </div>
            </div>
            <span className={`${styles['text_11']}`}>搜不到设备？手动添加</span>
            <span className={`${styles['text_12']}`}>风扇：</span>
            <div className={`${styles['list_2']} flex-row`}>
              <div className={`${styles['list-items_1-0']} flex-col`}>
                <div className={`${styles['image-text_4-0']} flex-col`}>
                  <div className={`${styles['image-wrapper_1-0']} flex-col`}>
                    <img
                      className={`${styles['label_3-0']}`}
                      src={
                        require('./assets/img/042100897e0244e9ab8ec7806cd57817_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_5-0']} flex-col`}>
                    <span className={`${styles['text_13-0']}`}>AS1100</span>
                    <span className={`${styles['text_14-0']}`}>AStar</span>
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
                <div className={`${styles['image-text_4-1']} flex-col`}>
                  <div className={`${styles['image-wrapper_1-1']} flex-col`}>
                    <img
                      className={`${styles['label_3-1']}`}
                      src={
                        require('./assets/img/dd92e0ffe3d348b8aee8ec781b522c0f_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_5-1']} flex-col`}>
                    <span className={`${styles['text_13-1']}`}>AS1101</span>
                    <span className={`${styles['text_14-1']}`}>AStar</span>
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
                <div className={`${styles['image-text_4-2']} flex-col`}>
                  <div className={`${styles['image-wrapper_1-2']} flex-col`}>
                    <img
                      className={`${styles['label_3-2']}`}
                      src={
                        require('./assets/img/7898379e31a641cf95158193fa0f47a1_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_5-2']} flex-col`}>
                    <span className={`${styles['text_13-2']}`}>AS1102</span>
                    <span className={`${styles['text_14-2']}`}>AStar</span>
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
            <div className={`${styles['group_4']} flex-col`}>
              <div className={`${styles['image-text_5']} flex-col`}>
                <div className={`${styles['image-wrapper_3']} flex-col`}>
                  <img
                    className={`${styles['label_4']}`}
                    src={
                      require('./assets/img/b8352bcc9d2042b9b33fef017a363233_mergeImage.png')
                    }
                  />
                </div>
                <div className={`${styles['text-group_6']} flex-col`}>
                  <span className={`${styles['text_15']}`}>AS1103</span>
                  <span className={`${styles['text_16']}`}>AStar</span>
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
            className={`${styles['image_4']}`}
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
