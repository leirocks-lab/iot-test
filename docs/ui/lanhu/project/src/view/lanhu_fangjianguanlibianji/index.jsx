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
        <div className={`${styles['section_1']} flex-row`}>
          <img
            className={`${styles['image_1']}`}
            src={
              require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
            }
          />
          <div className={`${styles['section_2']} flex-col`}>
            <div className={`${styles['section_3']} flex-row`}>
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
                className={`${styles['image_2']}`}
                src={
                  require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
                }
              />
            </div>
            <div className={`${styles['text-wrapper_1']} flex-row justify-between`}>
              <span className={`${styles['text_2']}`}>取消</span>
              <span className={`${styles['text_3']}`}>示例</span>
              <span className={`${styles['text_4']}`}>完成</span>
              <span className={`${styles['text_5']}`}>房间管理</span>
            </div>
            <div className={`${styles['section_4']} flex-col`}>
              <div className={`${styles['group_1']} flex-row`}>
                <div className={`${styles['image-text_1']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_1']}`}
                    src={
                      require('./assets/img/SketchPnge7b5351c1099532936d9e79f72888efc92f48219fc8fb7c6cfc393ba5d5ddb5e.png')
                    }
                  />
                  <span className={`${styles['text-group_1']}`}>客厅</span>
                </div>
                <span className={`${styles['text_6']}`}>2个设备</span>
                <img
                  className={`${styles['thumbnail_3']}`}
                  src={
                    require('./assets/img/SketchPngc2ec5bcdb82d224a61ec64fcc0bfc2bb0eefa86e096af09c18319a8877314206.png')
                  }
                />
              </div>
              <div className={`${styles['group_2']} flex-row justify-between`}>
                <div className={`${styles['image-text_2']} flex-row justify-between`}>
                  <div className={`${styles['image-wrapper_1']} flex-col`}>
                    <img
                      className={`${styles['label_2']}`}
                      src={
                        require('./assets/img/SketchPng25937da2040ea3b8ef7d5701456c37548586e368fdd94512910b1d607a719bf2.png')
                      }
                    />
                  </div>
                  <span className={`${styles['text-group_2']}`}>Air&nbsp;Conditioner</span>
                </div>
                <img
                  className={`${styles['thumbnail_4']}`}
                  src={
                    require('./assets/img/SketchPngc2ec5bcdb82d224a61ec64fcc0bfc2bb0eefa86e096af09c18319a8877314206.png')
                  }
                />
              </div>
              <div className={`${styles['group_3']} flex-row justify-between`}>
                <div className={`${styles['image-text_3']} flex-row justify-between`}>
                  <div className={`${styles['image-wrapper_2']} flex-col`}>
                    <img
                      className={`${styles['label_3']}`}
                      src={
                        require('./assets/img/SketchPng25937da2040ea3b8ef7d5701456c37548586e368fdd94512910b1d607a719bf2.png')
                      }
                    />
                  </div>
                  <span className={`${styles['text-group_3']}`}>Air&nbsp;Conditioner</span>
                </div>
                <img
                  className={`${styles['thumbnail_5']}`}
                  src={
                    require('./assets/img/SketchPngc2ec5bcdb82d224a61ec64fcc0bfc2bb0eefa86e096af09c18319a8877314206.png')
                  }
                />
                <div className={`${styles['box_1']} flex-col`}>
                  <div className={`${styles['box_2']} flex-row`}>
                    <div className={`${styles['image-text_4']} flex-row justify-between`}>
                      <div className={`${styles['image-wrapper_3']} flex-col`}>
                        <img
                          className={`${styles['label_4']}`}
                          src={
                            require('./assets/img/SketchPng25937da2040ea3b8ef7d5701456c37548586e368fdd94512910b1d607a719bf2.png')
                          }
                        />
                      </div>
                      <span className={`${styles['text-group_4']}`}>Air&nbsp;Conditioner</span>
                    </div>
                    <img
                      className={`${styles['thumbnail_6']}`}
                      src={
                        require('./assets/img/SketchPng7d5b0e6550d3a02dad4ae4354f0d7531312115b60f51f2eb5f983a4155071ce9.png')
                      }
                    />
                    <img
                      className={`${styles['thumbnail_7']}`}
                      src={
                        require('./assets/img/SketchPng8c6da59d4d359da8f48a5ad9a0dc8ee8a6f8b60f4b8798c10d06185c716ebf4f.png')
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className={`${styles['list_1']} flex-col`}>
              <div className={`${styles['list-items_1-0']} flex-row`}>
                <div className={`${styles['image-text_5-0']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_5-0']}`}
                    src={
                      require('./assets/img/SketchPnge7b5351c1099532936d9e79f72888efc92f48219fc8fb7c6cfc393ba5d5ddb5e.png')
                    }
                  />
                  <span className={`${styles['text-group_5-0']}`}>主卧</span>
                </div>
                <span className={`${styles['text_8-0']}`}>0个设备</span>
                <img
                  className={`${styles['thumbnail_8-0']}`}
                  src={
                    require('./assets/img/SketchPngc2ec5bcdb82d224a61ec64fcc0bfc2bb0eefa86e096af09c18319a8877314206.png')
                  }
                />
              </div>
              <div className={`${styles['list-items_1-1']} flex-row`}>
                <div className={`${styles['image-text_5-1']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_5-1']}`}
                    src={
                      require('./assets/img/SketchPnge7b5351c1099532936d9e79f72888efc92f48219fc8fb7c6cfc393ba5d5ddb5e.png')
                    }
                  />
                  <span className={`${styles['text-group_5-1']}`}>次卧</span>
                </div>
                <span className={`${styles['text_8-1']}`}>0个设备</span>
                <img
                  className={`${styles['thumbnail_8-1']}`}
                  src={
                    require('./assets/img/SketchPngc2ec5bcdb82d224a61ec64fcc0bfc2bb0eefa86e096af09c18319a8877314206.png')
                  }
                />
              </div>
              <div className={`${styles['list-items_1-2']} flex-row`}>
                <div className={`${styles['image-text_5-2']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_5-2']}`}
                    src={
                      require('./assets/img/SketchPnge7b5351c1099532936d9e79f72888efc92f48219fc8fb7c6cfc393ba5d5ddb5e.png')
                    }
                  />
                  <span className={`${styles['text-group_5-2']}`}>厨房</span>
                </div>
                <span className={`${styles['text_8-2']}`}>0个设备</span>
                <img
                  className={`${styles['thumbnail_8-2']}`}
                  src={
                    require('./assets/img/SketchPngc2ec5bcdb82d224a61ec64fcc0bfc2bb0eefa86e096af09c18319a8877314206.png')
                  }
                />
              </div>
              <div className={`${styles['list-items_1-3']} flex-row`}>
                <div className={`${styles['image-text_5-3']} flex-row justify-between`}>
                  <img
                    className={`${styles['label_5-3']}`}
                    src={
                      require('./assets/img/SketchPnge7b5351c1099532936d9e79f72888efc92f48219fc8fb7c6cfc393ba5d5ddb5e.png')
                    }
                  />
                  <span className={`${styles['text-group_5-3']}`}>分享给我</span>
                </div>
                <span className={`${styles['text_7-3']}`}>0个设备</span>
                <img
                  className={`${styles['thumbnail_8-3']}`}
                  src={
                    require('./assets/img/SketchPngc2ec5bcdb82d224a61ec64fcc0bfc2bb0eefa86e096af09c18319a8877314206.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['section_5']} flex-col`} />
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
