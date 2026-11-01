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
        <div className={`${styles['box_13']} flex-col`}>
          <div className={`${styles['group_14']} flex-row`}>
            <span className={`${styles['text_1']}`}>9:28</span>
            <img
              className={`${styles['thumbnail_1']}`}
              src={
                require('./assets/img/SketchPng6a27fa4042863b98a5a7a9bfc7c5865f310b56bfc9ccb2987cc8df89dc037218.png')
              }
            />
            <img
              className={`${styles['thumbnail_2']}`}
              src={
                require('./assets/img/SketchPngb3f2f90ac369a580e677221ed428c4d27c1acf3525e5b76c694ac5a67c49f56c.png')
              }
            />
            <img
              className={`${styles['image_1']}`}
              src={
                require('./assets/img/SketchPnge83bc6f2d9d38a6cfee9f97528a3e46d5006637b6a0dbe55250ad92528499a38.png')
              }
            />
          </div>
          <div className={`${styles['group_15']} flex-row`}>
            <img
              className={`${styles['thumbnail_3']}`}
              src={
                require('./assets/img/SketchPng6ebc2e7ec02dcb74e970f5807decf7decc612503a36619059b58534d6135213e.png')
              }
            />
            <span className={`${styles['text_2']}`}>酒柜</span>
            <img
              className={`${styles['label_1']}`}
              src={
                require('./assets/img/SketchPnged609f229d14643fd946a0689a5b3006b7aa0e6d02c8d7eb1b91a5d511e8686e.png')
              }
            />
          </div>
          <div className={`${styles['group_16']} flex-row`}>
            <div className={`${styles['box_1']} flex-row justify-between`}>
              <div className={`${styles['group_5']} flex-col`} />
              <span className={`${styles['text_3']}`}>制冷中</span>
              <div className={`${styles['group_6']} flex-row`}>
                <div className={`${styles['image-text_6']} flex-row justify-between`}>
                  <div className={`${styles['box_2']} flex-col`} />
                  <span className={`${styles['text-group_1']}`}>已关机</span>
                </div>
              </div>
            </div>
          </div>
          <div className={`${styles['group_17']} flex-row`}>
            <div className={`${styles['box_3']} flex-col`}>
              <div className={`${styles['group_8']} flex-col`} />
              <div className={`${styles['group_9']} flex-row justify-around`}>
                <div className={`${styles['image-wrapper_1']} flex-col`}>
                  <img
                    className={`${styles['image_2']}`}
                    src={
                      require('./assets/img/77cb9185e58b47bba888203334b8c55f_mergeImage.png')
                    }
                  />
                </div>
                <div className={`${styles['image-wrapper_2']} flex-col`}>
                  <img
                    className={`${styles['image_3']}`}
                    src={
                      require('./assets/img/092c47601d13418dbda819b0503efff4_mergeImage.png')
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={`${styles['group_10']} flex-col`}>
          <div className={`${styles['section_3']} flex-row`}>
            <div className={`${styles['section_1']} flex-row justify-between`}>
              <div className={`${styles['text-wrapper_1']} flex-col`}>
                <span className={`${styles['text_4']}`}>°C</span>
              </div>
              <span className={`${styles['text_5']}`}>°F</span>
            </div>
          </div>
          <div className={`${styles['section_4']} flex-row justify-between`}>
            <img
              className={`${styles['label_2']}`}
              src={
                require('./assets/img/SketchPng4d3bc2c69a78dd08c0d2cab65b05e4ac8cca5d96c70ba278227dab028d7c7804.png')
              }
            />
            <div className={`${styles['box_14']} flex-col`}>
              <div className={`${styles['text-wrapper_7']} flex-row justify-between`}>
                <span className={`${styles['text_6']}`}>35</span>
                <span className={`${styles['text_7']}`}>°C</span>
              </div>
              <span className={`${styles['text_8']}`}>左温区&nbsp;温度设置</span>
            </div>
            <img
              className={`${styles['label_3']}`}
              src={
                require('./assets/img/SketchPnge541622ab546d914b7a2b2a3c122e5eb20dfe3fa0c44d129c3a1724cd4c881d6.png')
              }
            />
          </div>
          <div className={`${styles['section_5']} flex-row justify-between`}>
            <img
              className={`${styles['label_4']}`}
              src={
                require('./assets/img/SketchPng4d3bc2c69a78dd08c0d2cab65b05e4ac8cca5d96c70ba278227dab028d7c7804.png')
              }
            />
            <div className={`${styles['group_18']} flex-col`}>
              <div className={`${styles['text-wrapper_8']} flex-row justify-between`}>
                <span className={`${styles['text_9']}`}>40</span>
                <span className={`${styles['text_10']}`}>°C</span>
              </div>
              <span className={`${styles['text_11']}`}>右温区&nbsp;温度设置</span>
            </div>
            <img
              className={`${styles['label_5']}`}
              src={
                require('./assets/img/SketchPnge541622ab546d914b7a2b2a3c122e5eb20dfe3fa0c44d129c3a1724cd4c881d6.png')
              }
            />
          </div>
        </div>
        <div className={`${styles['group_11']} flex-col`}>
          <div className={`${styles['block_3']} flex-row justify-between`}>
            <div className={`${styles['image-text_7']} flex-row justify-between`}>
              <img
                className={`${styles['label_6']}`}
                src={
                  require('./assets/img/SketchPng5e76b828e3a87da8474151757bf93d85f6cc6d9821255e9f4d2da8c489bba5a7.png')
                }
              />
              <span className={`${styles['text-group_2']}`}>灯光</span>
            </div>
            <img
              className={`${styles['label_7']}`}
              src={
                require('./assets/img/SketchPng6da0dcb1ecad42ad5fcf9c4f1898acd4bdb8b2f4b027bed542716307741e2433.png')
              }
            />
          </div>
          <div className={`${styles['block_4']} flex-row justify-between`}>
            <div className={`${styles['image-text_8']} flex-col`}>
              <div className={`${styles['group_12']} flex-col`} />
              <span className={`${styles['text-group_3']}`}>白色</span>
            </div>
            <div className={`${styles['image-text_9']} flex-col`}>
              <div className={`${styles['box_9']} flex-col`} />
              <span className={`${styles['text-group_4']}`}>琥珀色</span>
            </div>
            <div className={`${styles['block_5']} flex-col`}>
              <div className={`${styles['box_10']} flex-col`} />
              <span className={`${styles['text_12']}`}>蓝色</span>
            </div>
          </div>
          <div className={`${styles['block_6']} flex-row justify-between`}>
            <span className={`${styles['text_13']}`}>灯光亮度</span>
            <img
              className={`${styles['thumbnail_4']}`}
              src={
                require('./assets/img/SketchPng92f379f0f86dbd997164983e5a18293192680335f46ea7909514aa645b4764f2.png')
              }
            />
            <span className={`${styles['text_14']}`}>30%</span>
          </div>
          <div className={`${styles['block_7']} flex-row`}>
            <div className={`${styles['text-wrapper_4']} flex-col`}>
              <span className={`${styles['text_15']}`}>30%</span>
            </div>
            <div className={`${styles['text-wrapper_5']} flex-col`}>
              <span className={`${styles['text_16']}`}>60%</span>
            </div>
            <div className={`${styles['text-wrapper_6']} flex-col`}>
              <span className={`${styles['text_17']}`}>100%</span>
            </div>
          </div>
          <div className={`${styles['image-wrapper_3']} flex-col`}>
            <img
              className={`${styles['thumbnail_5']}`}
              src={
                require('./assets/img/SketchPnga60bf46119ab6ce33b78b516d0c2e861389bb0d91aac22dcedaf26ac2dbd7eec.png')
              }
            />
          </div>
        </div>
        <div className={`${styles['group_13']} flex-col`}>
          <div className={`${styles['list_2']} flex-row`}>
            <div className={`${styles['image-text_10-0']} flex-col`}>
              <img
                className={`${styles['label_8-0']}`}
                src={
                  require('./assets/img/SketchPngddc79b030011a67fd6970429e680885c19bed65764f0218e6c8d64601f24e229.png')
                }
              />
              <span className={`${styles['text-group_5-0']}`}>开关</span>
            </div>
            <div className={`${styles['image-text_10-1']} flex-col`}>
              <img
                className={`${styles['label_8-1']}`}
                src={
                  require('./assets/img/SketchPngc5d501869073fabf4626584551c6fffcccc7cd1b0ce70bf5c717729d994760a1.png')
                }
              />
              <span className={`${styles['text-group_5-1']}`}>童锁</span>
            </div>
          </div>
          <img
            className={`${styles['image_4']}`}
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
