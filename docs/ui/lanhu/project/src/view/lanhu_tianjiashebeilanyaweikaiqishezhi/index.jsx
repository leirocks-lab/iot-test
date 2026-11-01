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
        <div className={`${styles['group_2']} flex-row justify-between`}>
          <img
            className={`${styles['label_1']}`}
            src={
              require('./assets/img/02b42f5b817c4092868c7630ee4b5ae4_mergeImage.png')
            }
          />
          <span className={`${styles['text_2']}`}>添加设备</span>
        </div>
        <div className={`${styles['image-wrapper_1']} flex-row`}>
          <img
            className={`${styles['image_2']}`}
            src={
              require('./assets/img/SketchPng8131615878c0e1facd52b98ba27ad1ad1e627845f07ec94cc078919e9aa37c9e.png')
            }
          />
        </div>
        <div className={`${styles['text-wrapper_1']} flex-row`}>
          <span className={`${styles['text_3']}`}>正在扫描附近蓝牙设备</span>
        </div>
        <div className={`${styles['group_3']} flex-col`}>
          <div className={`${styles['text-wrapper_2']} flex-col`}>
            <span className={`${styles['text_4']}`}>权限与服务</span>
          </div>
          <div className={`${styles['block_1']} flex-col`}>
            <span className={`${styles['text_5']}`}>权限</span>
            <div className={`${styles['block_2']} flex-row justify-between`}>
              <span className={`${styles['text_6']}`}>位置权限</span>
              <img
                className={`${styles['label_2']}`}
                src={
                  require('./assets/img/SketchPng89c561bafde225306d9a0e2402a9ea69d6786f29e87bc4ace869a9f82070e701.png')
                }
              />
            </div>
            <div className={`${styles['block_3']} flex-row justify-between`}>
              <span className={`${styles['text_7']}`}>蓝牙权限</span>
              <img
                className={`${styles['label_3']}`}
                src={
                  require('./assets/img/SketchPng05e25c7f400ade75d9f3e12498ff956d77382ce25c2895623fe14ef92592eab1.png')
                }
              />
            </div>
            <span className={`${styles['text_8']}`}>需要权限以访问Wi-Fi和蓝牙以发现设备</span>
            <span className={`${styles['text_9']}`}>服务</span>
            <div className={`${styles['list_1']} flex-col`}>
              <div className={`${styles['list-items_1-0']} flex-row justify-between`}>
                <span className={`${styles['text_10-0']}`}>位置权限</span>
                <img
                  className={`${styles['label_4-0']}`}
                  src={
                    require('./assets/img/SketchPng89c561bafde225306d9a0e2402a9ea69d6786f29e87bc4ace869a9f82070e701.png')
                  }
                />
              </div>
              <div className={`${styles['list-items_1-1']} flex-row justify-between`}>
                <span className={`${styles['text_10-1']}`}>蓝牙权限</span>
                <img
                  className={`${styles['label_4-1']}`}
                  src={
                    require('./assets/img/SketchPng05e25c7f400ade75d9f3e12498ff956d77382ce25c2895623fe14ef92592eab1.png')
                  }
                />
              </div>
            </div>
            <span className={`${styles['text_11']}`}>启用蓝牙和位置服务以扫描和链接附近的设备</span>
          </div>
          <div className={`${styles['block_4']} flex-row justify-between`}>
            <div className={`${styles['text-wrapper_3']} flex-col`}>
              <span className={`${styles['text_12']}`}>取消</span>
            </div>
            <div className={`${styles['text-wrapper_4']} flex-col`}>
              <span className={`${styles['text_13']}`}>确定</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
