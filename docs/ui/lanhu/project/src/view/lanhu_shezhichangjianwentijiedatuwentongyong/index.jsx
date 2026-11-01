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
        <div className={`${styles['block_1']} flex-row`}>
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
              require('./assets/img/5bb8b501bcf14f30be9f7ea91711d204_mergeImage.png')
            }
          />
          <div className={`${styles['text-group_1']} flex-row`}>
            <span className={`${styles['text_2']}`}>示例</span>
            <span className={`${styles['text_3']}`}>常见问题</span>
          </div>
        </div>
        <span className={`${styles['text_4']}`}>如何连接到Alexa？</span>
        <span className={`${styles['paragraph_1']}`}>
          第一步：&nbsp;下载alexa-app，并登录alexa账号
          <br />
          （没有账号需要先注册）
        </span>
        <div className={`${styles['block_2']} flex-col`} />
        <span className={`${styles['paragraph_2']}`}>
          第二步：运行alexa-app,&nbsp;进入主界面下滑到界
          <br />
          面下方，选择&nbsp;See&nbsp;More
        </span>
        <div className={`${styles['block_3']} flex-col`} />
        <span className={`${styles['paragraph_3']}`}>
          第三步：&nbsp;在Search&nbsp;Alexa&nbsp;Skills中搜索zafro，
          <br />
          点击zafro，在弹出界面点击ENABLE&nbsp;TO&nbsp;USE
        </span>
        <div className={`${styles['image-wrapper_1']} flex-col`}>
          <img
            className={`${styles['image_2']}`}
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
