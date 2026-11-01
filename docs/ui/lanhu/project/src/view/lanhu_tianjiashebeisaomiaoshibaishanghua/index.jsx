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
                  require('./assets/img/f430640490354081a01335fc42ad7c08_mergeImage.png')
                }
              />
              <span className={`${styles['text-group_1']}`}>添加设备</span>
            </div>
            <div className={`${styles['box_4']} flex-row justify-between`}>
              <div className={`${styles['image-text_2']} flex-row justify-between`}>
                <img
                  className={`${styles['label_2']}`}
                  src={
                    require('./assets/img/SketchPng188300693d06028ea80c5744a944ae2c03697206e78a28e97547366ca37e0875.png')
                  }
                />
                <span className={`${styles['text-group_2']}`}>未发现设备</span>
              </div>
              <div className={`${styles['text-wrapper_1']} flex-col`}>
                <span className={`${styles['text_2']}`}>重新扫描</span>
              </div>
            </div>
            <span className={`${styles['text_3']}`}>搜不到设备？手动添加</span>
            <span className={`${styles['text_4']}`}>风扇：</span>
            <div className={`${styles['box_5']} flex-row justify-between`}>
              <div className={`${styles['group_1']} flex-col`}>
                <div className={`${styles['image-text_3']} flex-col`}>
                  <div className={`${styles['image-wrapper_1']} flex-col`}>
                    <img
                      className={`${styles['label_3']}`}
                      src={
                        require('./assets/img/d92e79a22b1c4739b9029a672804ff90_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_3']} flex-col`}>
                    <span className={`${styles['text_5']}`}>AS1100</span>
                    <span className={`${styles['text_6']}`}>AStar</span>
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
              <div className={`${styles['group_2']} flex-col`}>
                <div className={`${styles['image-text_4']} flex-col`}>
                  <div className={`${styles['image-wrapper_3']} flex-col`}>
                    <img
                      className={`${styles['label_4']}`}
                      src={
                        require('./assets/img/181d9f2f73e445f0869839666956fe35_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_4']} flex-col`}>
                    <span className={`${styles['text_7']}`}>AS1101</span>
                    <span className={`${styles['text_8']}`}>AStar</span>
                  </div>
                </div>
                <img
                  className={`${styles['thumbnail_5']}`}
                  src={
                    require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                  }
                />
              </div>
              <div className={`${styles['group_3']} flex-col`}>
                <div className={`${styles['image-text_5']} flex-col`}>
                  <div className={`${styles['image-wrapper_4']} flex-col`}>
                    <img
                      className={`${styles['label_5']}`}
                      src={
                        require('./assets/img/410ff36f8a7a43f0a8cd261e5dd4543f_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_5']} flex-col`}>
                    <span className={`${styles['text_9']}`}>AS1102</span>
                    <span className={`${styles['text_10']}`}>AStar</span>
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
            <div className={`${styles['box_6']} flex-col`}>
              <div className={`${styles['image-text_6']} flex-col`}>
                <div className={`${styles['image-wrapper_6']} flex-col`}>
                  <img
                    className={`${styles['label_6']}`}
                    src={
                      require('./assets/img/6e28bc7dc93c4ad3ab35b70ba96c3ddb_mergeImage.png')
                    }
                  />
                </div>
                <div className={`${styles['text-group_6']} flex-col`}>
                  <span className={`${styles['text_11']}`}>AS1103</span>
                  <span className={`${styles['text_12']}`}>AStar</span>
                </div>
              </div>
              <img
                className={`${styles['thumbnail_8']}`}
                src={
                  require('./assets/img/SketchPng8145c8fa5669c39f427c097c4a68bf309f3339eed86802c75e748943dbf5c70d.png')
                }
              />
            </div>
            <span className={`${styles['text_13']}`}>酒柜：</span>
            <div className={`${styles['box_7']} flex-row justify-between`}>
              <div className={`${styles['block_1']} flex-col`}>
                <div className={`${styles['image-text_7']} flex-col`}>
                  <div className={`${styles['image-wrapper_7']} flex-col`}>
                    <img
                      className={`${styles['label_7']}`}
                      src={
                        require('./assets/img/90b7805611b94141b9bb4ed8f7617f14_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_7']} flex-col`}>
                    <span className={`${styles['text_14']}`}>AS1100</span>
                    <span className={`${styles['text_15']}`}>AStar</span>
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
                        require('./assets/img/ea1e591d729d4c9b9910acd3abf5e214_mergeImage.png')
                      }
                    />
                  </div>
                  <div className={`${styles['text-group_8']} flex-col`}>
                    <span className={`${styles['text_16']}`}>AS1101</span>
                    <span className={`${styles['text_17']}`}>AStar</span>
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
              require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
            }
          />
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
