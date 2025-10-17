import React, { Suspense } from 'react';
import { Route, Routes as ReactRoutes } from 'react-router-dom';
import flattenDeep from 'lodash/flattenDeep';
import ProtectedRoute from './ProtectedRoutes/index';
import Loading from '../components/Loading';

const generateFlattenRoutes = (routes) => {
  if (!routes) return [];
  return flattenDeep(
    routes.map(
      ({ routes: subRoutes, component: Component, path, name, ...rest }) => [
        {
          ...rest,
          component: Component,
          path,
          name,
        },
        generateFlattenRoutes(subRoutes),
      ],
    ),
  );
};

export const renderRoutes = (mainRoutes) => {
  const Routes = ({ isAuthorized }) => {
    const layouts = mainRoutes.map(
      ({ layout: Layout, routes, isPublic }, index) => {
        const subRoutes = generateFlattenRoutes(routes);
        return (
          <Route key={index} element={<Layout />}>
            <Route
              element={
                <ProtectedRoute
                  isPublic={routes[0]?.isPublic}
                  isAuthorized={isAuthorized}
                />
              }
            >
              {subRoutes.map(({ component: Component, path, name }) => {
                return (
                  Component &&
                  path && (
                    <Route
                      key={name}
                      path={path}
                      element={
                        <Suspense
                          fallback={
                            <div className="w-full h-full p-96 flex justify-center items-center">
                              <Loading />
                            </div>
                          }
                        >
                          <Component />
                        </Suspense>
                      }
                    />
                  )
                );
              })}
            </Route>
          </Route>
        );
      },
    );
    return <ReactRoutes>{layouts}</ReactRoutes>;
  };
  return Routes;
};
