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
        <img
          className={`${styles['image_1']}`}
          src={
            require('./assets/img/SketchPng80caa3040b78375ceb1fdacea76a8e49a6de84e0c23b8fd9f00e39b36b750b2b.png')
          }
        />
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
              className={`${styles['image_2']}`}
              src={
                require('./assets/img/SketchPngf8248615de614e6e2a296b516cfef4b2041fdfaf781ae90a7beb64e4ce57bf26.png')
              }
            />
          </div>
          <div className={`${styles['box_2']} flex-row justify-between`}>
            <img
              className={`${styles['label_1']}`}
              src={
                require('./assets/img/3bca451afa77474a96b27e6f93d228ec_mergeImage.png')
              }
            />
            <div className={`${styles['image-text_1']} flex-row justify-between`}>
              <span className={`${styles['text-group_1']}`}>Dehumidifier</span>
              <img
                className={`${styles['label_2']}`}
                src={
                  require('./assets/img/SketchPngc223818979f6181347b55858a29b68365d47ebababd8d834021fd26776b8ba64.png')
                }
              />
            </div>
          </div>
        </div>
        <div className={`${styles['group_2']} flex-col`}>
          <div className={`${styles['block_1']} flex-row justify-between`}>
            <div className={`${styles['box_3']} flex-col`} />
            <span className={`${styles['text_2']}`}>Dehumidifying</span>
          </div>
          <div className={`${styles['block_2']} flex-row`}>
            <span className={`${styles['text_3']}`}>40</span>
            <span className={`${styles['text_4']}`}>%</span>
            <div className={`${styles['image-text_2']} flex-col`}>
              <div className={`${styles['box_4']} flex-col`}>
                <div className={`${styles['section_1']} flex-row justify-between`}>
                  <div className={`${styles['image-text_3']} flex-row justify-between`}>
                    <img
                      className={`${styles['thumbnail_3']}`}
                      src={
                        require('./assets/img/SketchPng5b531527afaa4b3efd7268f71800b747e03493fad5d5d57aaa574df641ad793e.png')
                      }
                    />
                    <span className={`${styles['text-group_2']}`}>已使用&nbsp;215小时，注意清洁机器</span>
                  </div>
                  <img
                    className={`${styles['thumbnail_4']}`}
                    src={
                      require('./assets/img/SketchPngb4c06a58a484033cb7d2ffd64aadaa7cff9bdb3ab9a8536363abd1f8cb72edc8.png')
                    }
                  />
                  <div className={`${styles['image-text_4']} flex-row justify-between`}>
                    <img
                      className={`${styles['thumbnail_3']}`}
                      src={
                        require('./assets/img/SketchPng5b531527afaa4b3efd7268f71800b747e03493fad5d5d57aaa574df641ad793e.png')
                      }
                    />
                    <span className={`${styles['text-group_2']}`}>已使用&nbsp;215小时，注意清洁机器</span>
                  </div>
                </div>
              </div>
              <div className={`${styles['text-group_3']} flex-row justify-between`}>
                <span className={`${styles['text_5']}`}>32</span>
                <span className={`${styles['text_6']}`}>%</span>
              </div>
            </div>
            <span className={`${styles['text_7']}`}>30</span>
            <span className={`${styles['text_8']}`}>%</span>
          </div>
          <div className={`${styles['text-wrapper_1']} flex-row justify-between`}>
            <span className={`${styles['text_9']}`}>目标湿度</span>
            <span className={`${styles['text_10']}`}>当前湿度</span>
            <span className={`${styles['text_11']}`}>室外湿度</span>
          </div>
          <div className={`${styles['block_3']} flex-col`}>
            <span className={`${styles['text_12']}`}>湿度</span>
            <div className={`${styles['box_5']} flex-col`}>
              <div className={`${styles['group_3']} flex-col`}>
                <div className={`${styles['box_6']} flex-col`} />
              </div>
            </div>
            <div className={`${styles['text-wrapper_2']} flex-row justify-between`}>
              <span className={`${styles['text_13']}`}>40%</span>
              <span className={`${styles['text_14']}`}>45%</span>
              <span className={`${styles['text_15']}`}>50%</span>
              <span className={`${styles['text_16']}`}>55%</span>
              <span className={`${styles['text_17']}`}>60%</span>
              <span className={`${styles['text_18']}`}>F%</span>
            </div>
          </div>
          <div className={`${styles['list_1']} flex-row`}>
            <div className={`${styles['image-text_5-0']} flex-col`}>
              <img
                className={`${styles['label_3-0']}`}
                src={
                  require('./assets/img/SketchPngcbb13543993d6456761007f279e69dc969c5a514ee7a039a82e5842e778b2ccf.png')
                }
              />
              <span className={`${styles['text-group_4-0']}`}>童锁</span>
            </div>
            <div className={`${styles['image-text_5-1']} flex-col`}>
              <img
                className={`${styles['label_3-1']}`}
                src={
                  require('./assets/img/SketchPnga4c263596b1dff65d4a121ebd97fdbf965d5e4acf5b20a9d925750ad5d2c33df.png')
                }
              />
              <span className={`${styles['text-group_4-1']}`}>熄灯</span>
            </div>
            <div className={`${styles['image-text_5-2']} flex-col`}>
              <img
                className={`${styles['label_3-2']}`}
                src={
                  require('./assets/img/SketchPng9b13dc5ef8c2ce1608a311532ff28f723d06b7d8708c5b8ca5fe088e1eacca1e.png')
                }
              />
              <span className={`${styles['text-group_4-2']}`}>静音</span>
            </div>
          </div>
          <div className={`${styles['block_4']} flex-row justify-between`}>
            <div className={`${styles['image-text_6']} flex-row justify-between`}>
              <img
                className={`${styles['label_4']}`}
                src={
                  require('./assets/img/SketchPng4367b628853cfa887f65ca68d173e562b7f262f30eb4abfbfe923c3353f0f4d6.png')
                }
              />
              <span className={`${styles['text-group_5']}`}>睡眠模式</span>
            </div>
            <img
              className={`${styles['label_5']}`}
              src={
                require('./assets/img/SketchPngff84ee6a8247152c5cfdaad0203f9b54c19bbf07736e0f2090318489786210ae.png')
              }
            />
          </div>
          <div className={`${styles['block_5']} flex-col`}>
            <div className={`${styles['list_2']} flex-row`}>
              <div className={`${styles['image-text_7-0']} flex-col`}>
                <img
                  className={`${styles['label_6-0']}`}
                  src={
                    require('./assets/img/SketchPng02a76c08d66c6c6d9f6cd9c55c89848f984a69984d1fd9aab0a0bb1703200596.png')
                  }
                />
                <span className={`${styles['text-group_6-0']}`}>开关</span>
              </div>
              <div className={`${styles['image-text_7-1']} flex-col`}>
                <img
                  className={`${styles['label_6-1']}`}
                  src={
                    require('./assets/img/SketchPng6096e6560ae5119fa8b82a6a8ad1ac02c200077c12831da47c8075bf41a8468c.png')
                  }
                />
                <span className={`${styles['text-group_6-1']}`}>定时｜关</span>
              </div>
            </div>
            <img
              className={`${styles['image_3']}`}
              src={
                require('./assets/img/SketchPngdb52b001b113a4472d2153a7a83c24574aff8e4b4a27f1bbefad18fe2043e1c0.png')
              }
            />
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
