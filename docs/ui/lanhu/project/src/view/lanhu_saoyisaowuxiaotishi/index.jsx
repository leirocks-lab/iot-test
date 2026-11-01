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
        <div className={`${styles['box_1']} flex-col`}>
          <div className={`${styles['box_2']} flex-col`}>
            <div className={`${styles['block_2']} flex-row justify-between`}>
              <img
                className={`${styles['label_2']}`}
                src={
                  require('./assets/img/260705d67f6742eabd85a458944f35cc_mergeImage.png')
                }
              />
              <span className={`${styles['text_1']}`}>扫一扫</span>
            </div>
            <div className={`${styles['block_3']} flex-row`}>
              <div className={`${styles['block_1']} flex-col`} />
            </div>
            <div className={`${styles['block_4']} flex-row`}>
              <div className={`${styles['text-group_2']} flex-col`}>
                <span className={`${styles['text_2']}`}>扫描设备二维码</span>
                <span className={`${styles['text_3']}`}>在配件、包装或说明书上查找产品二维码，并将其放在上方相机取景框内</span>
              </div>
            </div>
            <div className={`${styles['block_5']} flex-row`}>
              <div className={`${styles['text-wrapper_3']} flex-col`}>
                <span className={`${styles['text_6']}`}>使用相册</span>
              </div>
            </div>
            <div className={`${styles['box_7']} flex-col`}>
              <div className={`${styles['box_8']} flex-col`} />
              <div className={`${styles['text-wrapper_2']} flex-col`}>
                <span className={`${styles['text_5']}`}>无效的二维码/条形码</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
