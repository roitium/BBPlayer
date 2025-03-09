import { useFocusEffect } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

export default function useRefreshQueriesOnFocus(
  queryKeys: (readonly unknown[])[],
) {
  const queryClient = useQueryClient()

  useFocusEffect(
    React.useCallback(() => {
      for (const key of queryKeys) {
        console.log(
          `key: ${key}, isInvalidated: ${queryClient.getQueryState(key)?.isInvalidated}`,
        )
        if (queryClient.getQueryState(key)?.isInvalidated) {
          console.log('refetching key: ', key)
          queryClient.refetchQueries({ queryKey: [key] })
        }
      }
    }, [queryClient, queryKeys]),
  )
}
