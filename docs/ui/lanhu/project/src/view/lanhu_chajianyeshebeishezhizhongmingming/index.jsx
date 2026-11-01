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
        <div className={`${styles['group_1']} flex-col`}>
          <div className={`${styles['box_1']} flex-row`}>
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
          <div className={`${styles['box_2']} flex-row justify-between`}>
            <img
              className={`${styles['thumbnail_3']}`}
              src={
                require('./assets/img/SketchPngc8fd641a50d088563b0f84ac603b9d796243ed99057556d3c5f2f54cb8a6ef92.png')
              }
            />
            <span className={`${styles['text_2']}`}>设置</span>
          </div>
          <div className={`${styles['box_3']} flex-row`}>
            <div className={`${styles['box_4']} flex-col`}>
              <img
                className={`${styles['image_2']}`}
                src={
                  require('./assets/img/SketchPng3613bbe3921f220f55f9f51d0ec47e2427bbd8b8a44ce8e6ac9fa58b1aa4ad73.png')
                }
              />
              <div className={`${styles['box_5']} flex-col`} />
            </div>
            <div className={`${styles['text-group_1']} flex-col`}>
              <span className={`${styles['text_3']}`}>左右双开酒柜</span>
              <span className={`${styles['text_4']}`}>RW-400PRO</span>
              <span className={`${styles['text_5']}`}>MAC.:&nbsp;R26073100012607310001</span>
            </div>
            <img
              className={`${styles['label_1']}`}
              src={
                require('./assets/img/96da56f435c94cad84eb12a1159ea2b8_mergeImage.png')
              }
            />
            <div className={`${styles['box_6']} flex-col`}>
              <div className={`${styles['section_1']} flex-col`} />
              <div className={`${styles['section_2']} flex-col`}>
                <div className={`${styles['box_7']} flex-col`} />
              </div>
              <div className={`${styles['section_3']} flex-col`}>
                <div className={`${styles['image-wrapper_1']} flex-row justify-between`}>
                  <img
                    className={`${styles['thumbnail_4']}`}
                    src={
                      require('./assets/img/d3aa89f41e6b43f69d18b97e3971cfbe_mergeImage.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_5']}`}
                    src={
                      require('./assets/img/09b5f76ebc514b1ca89272258d2bd48f_mergeImage.png')
                    }
                  />
                </div>
                <div className={`${styles['image-wrapper_2']} flex-row justify-between`}>
                  <img
                    className={`${styles['thumbnail_6']}`}
                    src={
                      require('./assets/img/SketchPngaea976fcf2c6c9e7a775286f68789c685a0952315bf3195ea2a23a879abf9ecd.png')
                    }
                  />
                  <img
                    className={`${styles['thumbnail_7']}`}
                    src={
                      require('./assets/img/SketchPng27a971e4ea01016e88217f275fdd2ec886a924fbfcf87994945822ed8b8a5b16.png')
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles['list_1']} flex-col`}>
            <div className={`${styles['list-items_1-0']} flex-row`}>
              <span className={`${styles['text_6-0']}`}>使用场景</span>
              <div className={`${styles['image-text_1-0']} flex-row justify-between`}>
                <span className={`${styles['text-group_2-0']}`}>默认房间</span>
                <img
                  className={`${styles['thumbnail_9-0']}`}
                  src={
                    require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                  }
                />
              </div>
            </div>
            <div className={`${styles['list-items_1-1']} flex-row`}>
              <span className={`${styles['text_6-1']}`}>设备分享</span>
              <img
                className={`${styles['thumbnail_8-1']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
            <div className={`${styles['list-items_1-2']} flex-row`}>
              <span className={`${styles['text_6-2']}`}>温度单位</span>
              <span className={`${styles['text_7-2']}`}>°F</span>
              <img
                className={`${styles['thumbnail_8-2']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
            <div className={`${styles['list-items_1-3']} flex-row`}>
              <span className={`${styles['text_6-3']}`}>使用统计</span>
              <img
                className={`${styles['thumbnail_8-3']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
            <div className={`${styles['list-items_1-4']} flex-row`}>
              <span className={`${styles['text_6-4']}`}>Wi-Fi信息</span>
              <img
                className={`${styles['thumbnail_8-4']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
            <div className={`${styles['list-items_1-5']} flex-row`}>
              <span className={`${styles['text_6-5']}`}>模组固件版本</span>
              <img
                className={`${styles['thumbnail_8-5']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
            <div className={`${styles['list-items_1-6']} flex-row`}>
              <span className={`${styles['text_6-6']}`}>mcu固件版本</span>
              <img
                className={`${styles['thumbnail_8-6']}`}
                src={
                  require('./assets/img/SketchPngf6c1443c92bbb6ebdf6d604f1e6a8608b8c3808662bd7d5a8caeb23bec8ce657.png')
                }
              />
            </div>
          </div>
          <div className={`${styles['text-wrapper_1']} flex-col`}>
            <span className={`${styles['text_8']}`}>解绑设备</span>
          </div>
        </div>
        <div className={`${styles['group_2']} flex-col`}>
          <div className={`${styles['group_3']} flex-col`}>
            <div className={`${styles['text-wrapper_2']} flex-col`}>
              <span className={`${styles['text_9']}`}>设备名称</span>
            </div>
            <div className={`${styles['text-wrapper_3']} flex-col`}>
              <span className={`${styles['text_10']}`}>请输入设备名称</span>
            </div>
            <div className={`${styles['group_4']} flex-row justify-between`}>
              <div className={`${styles['text-wrapper_4']} flex-col`}>
                <span className={`${styles['text_11']}`}>取消</span>
              </div>
              <div className={`${styles['text-wrapper_5']} flex-col`}>
                <span className={`${styles['text_12']}`}>确定</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
