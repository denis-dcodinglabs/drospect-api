import React from "react";
import { renderRoutes } from "./generateRoutes";
import { Navigate } from "react-router-dom";

import UserProfile from "../Views/Admin/UserProfile";
import Projects from "../Views/Projects";
import ProjectsMain from "../Views/Admin/Projects/Main";
import View from "../Views/Admin/Projects/View";
import DashboardLayout from "../components/DashboardLayout";
import LoginLayout from "../components/LoginLayout";
import NotFound from "../Views/NorFound";
import { Return } from "../components/Payments";
import Credits from "../Views/Admin/Credits";
import Users from "../Views/Admin/Users";
import HomePageLayout from "../components/HomepageLayout";

// Lazy load views
const Login = React.lazy(() => import("../Views/Admin/Login"));
const Home = React.lazy(() => import("../Views/Home"));
const PricingPlan = React.lazy(() => import("../Views/PackagePlan")); // Uncomment if needed

export const routes = [
  {
    layout: HomePageLayout,
    routes: [
      {
        name: "home",
        title: "Home page",
        component: Home,
        path: "/",
        isPublic: true,
      },
      {
        name: "projects",
        title: "Project page",
        component: Projects,
        path: "/projects/:id",
        isPublic: true,
      },
      {
        name: "pricing",
        title: "Pricing page",
        component: PricingPlan,
        path: "/pricing",
        isPublic: true,
      },
    ],
  },
  {
    layout: LoginLayout,
    routes: [
      {
        name: "login",
        title: "Login page",
        component: Login,
        path: "/login",
        isPublic: true,
      },
    ],
  },
  {
    layout: DashboardLayout,
    routes: [
      {
        name: "admin",
        title: "Admin",
        hasSiderLink: true,
        isPublic: false,
        routes: [
          {
            name: "admin",
            title: "Admin",
            hasSiderLink: true,
            component: () => <Navigate to={"/admin/profile"} />,
            path: "/admin",
            isPublic: false,
          },
          {
            name: "profile",
            title: "Profile",
            hasSiderLink: true,
            component: UserProfile,
            path: "/admin/profile",
            isPublic: false,
          },
          {
            name: "users",
            title: "Users",
            hasSiderLink: true,
            component: Users,
            path: "/admin/users",
            isPublic: false,
          },
          {
            name: "credits",
            title: "Credits",
            hasSiderLink: true,
            component: Credits,
            path: "/admin/credits",
            isPublic: false,
          },
          {
            name: "return",
            title: "Return",
            hasSiderLink: true,
            component: Return,
            path: "/admin/return",
            isPublic: false,
          },
          {
            name: "projects",
            title: "Projects",
            hasSiderLink: true,
            routes: [
              {
                name: "projects-list",
                title: "Projects List",
                hasSiderLink: true,
                component: ProjectsMain,
                path: "/admin/projects",
              },
              {
                name: "view-projects",
                title: "View Project",
                hasSiderLink: true,
                component: View,
                path: "/admin/project/:id",
              },
              {
                name: "project-report",
                title: "Project Report",
                hasSiderLink: true,
                component: Projects,
                path: "/admin/project/:slug/reports",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    layout: LoginLayout,
    routes: [
      {
        name: "notFound",
        title: "Not Found",
        component: NotFound,
        path: "*",
        isPublic: true,
      },
    ],
  },
];

export const Routes = renderRoutes(routes);
