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
        <div className={`${styles['block_1']} flex-col`}>
          <div className={`${styles['section_1']} flex-col`}>
            <div className={`${styles['box_10']} flex-row justify-between`}>
              <img
                className={`${styles['label_3']}`}
                src={
                  require('./assets/img/9f580fb70de44ca8968130325cdf4543_mergeImage.png')
                }
              />
              <span className={`${styles['text_1']}`}>扫一扫</span>
            </div>
            <div className={`${styles['box_11']} flex-row`}>
              <div className={`${styles['group_1']} flex-col`} />
            </div>
            <div className={`${styles['box_12']} flex-row`}>
              <div className={`${styles['text-group_3']} flex-col`}>
                <span className={`${styles['text_2']}`}>扫描设备二维码</span>
                <span className={`${styles['text_3']}`}>在配件、包装或说明书上查找产品二维码，并将其放在上方相机取景框内</span>
              </div>
            </div>
            <div className={`${styles['box_13']} flex-row`}>
              <div className={`${styles['text-wrapper_3']} flex-col`}>
                <span className={`${styles['text_6']}`}>使用相册</span>
              </div>
            </div>
            <div className={`${styles['box_5']} flex-col`}>
              <div className={`${styles['group_2']} flex-col`} />
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default DDS_lanhupage_0;
