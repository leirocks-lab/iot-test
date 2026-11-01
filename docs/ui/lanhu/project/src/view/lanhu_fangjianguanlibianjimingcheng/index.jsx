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
          <img
            className={`${styles['image_1']}`}
            src={
              require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
            }
          />
          <div className={`${styles['block_1']} flex-col`}>
            <div className={`${styles['section_1']} flex-row`}>
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
            <div className={`${styles['section_2']} flex-row justify-between`}>
              <div className={`${styles['image-text_1']} flex-row justify-between`}>
                <img
                  className={`${styles['label_1']}`}
                  src={
                    require('./assets/img/8a06a42e8c50493fb28a491913a6c365_mergeImage.png')
                  }
                />
                <div className={`${styles['text-group_1']} flex-row`}>
                  <span className={`${styles['text_2']}`}>示例</span>
                  <span className={`${styles['text_3']}`}>房间管理</span>
                </div>
              </div>
              <span className={`${styles['text_4']}`}>编辑</span>
            </div>
            <div className={`${styles['section_3']} flex-row`}>
              <span className={`${styles['text_5']}`}>客厅</span>
              <span className={`${styles['text_6']}`}>2个设备</span>
              <img
                className={`${styles['label_2']}`}
                src={
                  require('./assets/img/SketchPnge855ecdbfb9bd04ea2e2380a45cf820af89120c54376d94607205dd80e3e4453.png')
                }
              />
              <img
                className={`${styles['thumbnail_3']}`}
                src={
                  require('./assets/img/SketchPng94471601e0443c87a672970910b5b40ab0028bfa9c44fd1a818606e652ff22be.png')
                }
              />
            </div>
            <div className={`${styles['section_4']} flex-row`}>
              <div className={`${styles['image-text_2']} flex-row justify-between`}>
                <div className={`${styles['image-wrapper_1']} flex-col`}>
                  <img
                    className={`${styles['label_3']}`}
                    src={
                      require('./assets/img/SketchPng25937da2040ea3b8ef7d5701456c37548586e368fdd94512910b1d607a719bf2.png')
                    }
                  />
                </div>
                <span className={`${styles['text-group_2']}`}>Air&nbsp;Conditioner</span>
              </div>
            </div>
            <div className={`${styles['section_5']} flex-row`}>
              <div className={`${styles['image-text_3']} flex-row justify-between`}>
                <div className={`${styles['image-wrapper_2']} flex-col`}>
                  <img
                    className={`${styles['label_4']}`}
                    src={
                      require('./assets/img/SketchPng25937da2040ea3b8ef7d5701456c37548586e368fdd94512910b1d607a719bf2.png')
                    }
                  />
                </div>
                <span className={`${styles['text-group_3']}`}>Air&nbsp;Conditioner</span>
              </div>
            </div>
            <div className={`${styles['list_1']} flex-col`}>
              <div className={`${styles['list-items_1-0']} flex-row`}>
                <span className={`${styles['text_7-0']}`}>主卧</span>
                <span className={`${styles['text_9-0']}`}>0个设备</span>
                <img
                  className={`${styles['label_5-0']}`}
                  src={
                    require('./assets/img/SketchPnge855ecdbfb9bd04ea2e2380a45cf820af89120c54376d94607205dd80e3e4453.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_4-0']}`}
                  src={
                    require('./assets/img/SketchPng7b04382500b8b38e2090e9406e044867f4f65e641ad8d776f0ea315f0db53805.png')
                  }
                />
              </div>
              <div className={`${styles['list-items_1-1']} flex-row`}>
                <span className={`${styles['text_7-1']}`}>次卧</span>
                <span className={`${styles['text_9-1']}`}>0个设备</span>
                <img
                  className={`${styles['label_5-1']}`}
                  src={
                    require('./assets/img/SketchPnge855ecdbfb9bd04ea2e2380a45cf820af89120c54376d94607205dd80e3e4453.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_4-1']}`}
                  src={
                    require('./assets/img/SketchPng7b04382500b8b38e2090e9406e044867f4f65e641ad8d776f0ea315f0db53805.png')
                  }
                />
              </div>
              <div className={`${styles['list-items_1-2']} flex-row`}>
                <span className={`${styles['text_7-2']}`}>厨房</span>
                <span className={`${styles['text_9-2']}`}>0个设备</span>
                <img
                  className={`${styles['label_5-2']}`}
                  src={
                    require('./assets/img/SketchPnge855ecdbfb9bd04ea2e2380a45cf820af89120c54376d94607205dd80e3e4453.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_4-2']}`}
                  src={
                    require('./assets/img/SketchPng7b04382500b8b38e2090e9406e044867f4f65e641ad8d776f0ea315f0db53805.png')
                  }
                />
              </div>
              <div className={`${styles['list-items_1-3']} flex-row`}>
                <span className={`${styles['text_7-3']}`}>分享给我</span>
                <span className={`${styles['text_8-3']}`}>1个设备</span>
                <img
                  className={`${styles['label_5-3']}`}
                  src={
                    require('./assets/img/SketchPnge855ecdbfb9bd04ea2e2380a45cf820af89120c54376d94607205dd80e3e4453.png')
                  }
                />
                <img
                  className={`${styles['thumbnail_4-3']}`}
                  src={
                    require('./assets/img/SketchPng94471601e0443c87a672970910b5b40ab0028bfa9c44fd1a818606e652ff22be.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['section_6']} flex-row`}>
              <div className={`${styles['image-text_4']} flex-row justify-between`}>
                <div className={`${styles['image-wrapper_3']} flex-col`}>
                  <img
                    className={`${styles['label_6']}`}
                    src={
                      require('./assets/img/SketchPng25937da2040ea3b8ef7d5701456c37548586e368fdd94512910b1d607a719bf2.png')
                    }
                  />
                </div>
                <span className={`${styles['text-group_4']}`}>Air&nbsp;Conditioner</span>
              </div>
            </div>
            <div className={`${styles['section_7']} flex-col`} />
          </div>
        </div>
        <div className={`${styles['box_2']} flex-col`}>
          <div className={`${styles['block_2']} flex-col`}>
            <div className={`${styles['text-wrapper_1']} flex-col`}>
              <span className={`${styles['text_10']}`}>房间名称</span>
            </div>
            <div className={`${styles['text-wrapper_2']} flex-col`}>
              <span className={`${styles['text_11']}`}>请输入房间名称</span>
            </div>
            <div className={`${styles['group_1']} flex-row justify-between`}>
              <div className={`${styles['text-wrapper_3']} flex-col`}>
                <span className={`${styles['text_12']}`}>取消</span>
              </div>
              <div className={`${styles['text-wrapper_4']} flex-col`}>
                <span className={`${styles['text_13']}`}>确定</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
