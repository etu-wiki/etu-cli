/* global fetch:false */
import React from 'react'
import { OpenSeadragon } from './react-openseadragon/index'
import ReactLoading from 'react-loading'
const wx = require('weixin-js-sdk')

const SERVER_URL = process.env.REACT_APP_SERVER_URL
const IIIF_URL = process.env.REACT_APP_IIIF_URL

export default class OSDViewer extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      done: undefined,
      url: `${SERVER_URL}/${this.props.match.params.uuid}.dzi`
    }
  }

  async componentDidMount () {
    const self = this
    const IMAGE_URL = `${IIIF_URL}/${self.props.match.params.uuid}/square/!128,128/0/default.jpg`
    const url = window.location.href.split('#')[0]
    console.log('url: ' + url)

    const res = await fetch(`http://47.52.161.77/?url=${url}`)
      .then(response => response.json())
    console.log(res)

    // const wx = window.wx
    wx.config({
      debug: false,
      appId: res.appId,
      timestamp: res.timestamp,
      nonceStr: res.nonceStr,
      signature: res.signature,
      jsApiList: [
        // all the APIs that is allowed
        'onMenuShareAppMessage',
        'onMenuShareTimeline'
      ]
    })

    wx.ready(function () {
      wx.checkJsApi({
        jsApiList: [
          'onMenuShareAppMessage',
          'onMenuShareTimeline'
        ],
        fail: function () {
          document.alert('请升级您的微信')
        }
      })

      // 监听“分享给朋友”，按钮点击、自定义分享内容及分享结果接口
      wx.onMenuShareAppMessage({
        title: '易图',
        desc: '让图片更好用',
        link: url,
        imgUrl: IMAGE_URL
        // type: 'music', // 分享类型,music、video或link，不填默认为link
        // dataUrl: `http://gsh.huiyouwenhua.com/${gsh.id}.mp3`, // 如果type是music或video，则要提供数据链接，默认为空
      })

      // 监听“分享到朋友圈”按钮点击、自定义分享内容及分享结果接口
      wx.onMenuShareTimeline({
        title: '让图片更好用',
        link: url,
        imgUrl: IMAGE_URL
      })
    })

    pingUrl(1)

    function pingUrl (i) {
      fetch(self.state.url)
        .then(response => response)
        .then(json => {
          console.log(json.status)
          if (json.status === 200) {
            self.setState({ done: true })
            fetch(IMAGE_URL)
          } else {
            i += 1000
            console.log(i)
            setTimeout(() => pingUrl(i), i)
          }
        })
    }
  }

  render () {
    return (
      <div>
        {
          !this.state.done ? (
            <ReactLoading type='bars' color='white' />
          ) : (
            <OpenSeadragon
              tileSources={this.state.url}
              showNavigationControl
              showNavigator={false}
              showFullPageControl
              constrainDuringPan
              visibilityRatio='1'
              style={{
                width: '100vw',
                height: '100vh'
              }}
            />
          )
        }
      </div>
    )
  }
}
