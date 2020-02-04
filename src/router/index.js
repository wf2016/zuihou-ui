import Vue from 'vue'
import Router from 'vue-router'
import Layout from '@/layout'
import db from '@/utils/localstorage'
import store from '@/store/index'
import loginApi from '@/api/Login.js'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

Vue.use(Router)

const constRouter = [
  {
    path: '/redirect',
    component: Layout,
    hidden: true,
    children: [
      {
        path: '/redirect/:path*',
        component: () => import('@/views/redirect/index')
      }
    ]
  },
  {
    path: '/404',
    component: () => import('@/views/error-page/404'),
    hidden: true
  },
  {
    path: '/login',
    name: '登录页',
    component: () => import('@/views/login/index')
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        component: () => import('@/views/dashboard/index'),
        name: 'Dashboard',
        meta: { title: 'dashboard', icon: 'dashboard', affix: true }
      }
    ]
  },
  {
    path: '/profile',
    component: Layout,
    redirect: '/profile/index',
    hidden: true,
    children: [
      {
        path: 'index',
        component: () => import('@/views/profile/index'),
        name: 'Profile',
        meta: { title: 'profile', icon: 'user', noCache: true }
      },
      {
        hidden: true,
        path: '/sms/manage/edit',
        component: () => import('@/views/zuihou/sms/manage/Edit'),
        name: 'smsEdit',
        meta: {
          title: '发送短信', icon: '', noCache: true
        }
      }
    ]
  },
  {
    path: '/error',
    component: Layout,
    redirect: 'noRedirect',
    name: 'ErrorPages',
    meta: {
      title: 'errorPages',
      icon: '404'
    },
    children: [
      {
        path: '404',
        component: () => import('@/views/error-page/404'),
        name: 'Page404',
        meta: { title: 'page404', noCache: true }
      }
    ]
  },
  // 为什么写在这里 就会出错？
  // {
  //   path: "*",
  //   // redirect: '/404',
  //   component: () => import('@/views/error-page/404'),
  //   name: "all_404",
  //   hidden: false,
  //   alwaysShow: false
  // }
]

const router = new Router({
  scrollBehavior: () => ({ y: 0 }),
  routes: constRouter
})

const whiteList = ['/login']

let asyncRouter

// 导航守卫，渲染动态路由
router.beforeEach((to, from, next) => {
  NProgress.start()
  if (whiteList.indexOf(to.path) !== -1) {
    next()
  } else {
    const token = db.get('TOKEN')
    const user = db.get('USER')
    const userRouter = db.get('USER_ROUTER', '')
    if (token.length && user) {
      if (!asyncRouter) {
        if (!userRouter) {
          loginApi.getRouter({})
            .then((response) => {
              const res = response.data
              asyncRouter = res.data
              console.log('res.data=')
              console.log(res.data)

              if (!(asyncRouter && asyncRouter.length > 0)) {
                asyncRouter = []
              }
              asyncRouter.push({
                alwaysShow: false,
                component: "error-page/404",
                hidden: false,
                name: "404",
                path: "*"
              });

              //为什么要同时 调用这2个方法
              store.commit('account/setRoutes', asyncRouter)
              // db.save('USER_ROUTER', asyncRouter)

              go(to, next)
            })
        } else {
          asyncRouter = userRouter
          go(to, next)
        }
      } else {
        next()
      }
    } else {
      if (to.path === '/login') {
        next()
      } else {
        next('/login')
      }
    }
  }
})

router.afterEach(() => {
  NProgress.done()
})

function go (to, next) {
  asyncRouter = filterAsyncRouter(asyncRouter)
  router.addRoutes(asyncRouter)
  next({ ...to, replace: true })
}

function filterAsyncRouter (routes) {
  return routes.filter((route) => {
    const component = route.component
    if (component) {
      if (route.component === 'Layout') {
        route.component = Layout
      } else {
        route.component = view(component)
      }
      if (route.children && route.children.length) {
        route.children = filterAsyncRouter(route.children)
      }
      return true
    }
  })
}

function view (path) {
  return function (resolve) {
    import(`@/views/${path}.vue`).then(mod => {
      resolve(mod)
    })
  }
}

export default router
