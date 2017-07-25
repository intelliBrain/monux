import * as Debug from 'debug'
import * as d3 from 'd3'
import {
  isSameMonth,
  subMonths,
  differenceInCalendarMonths,
  format
} from 'date-fns'

import cache, { ICacheTransaction } from './cache'
import { Amount, Transaction } from '../../lib/monzo'

const debug = Debug('app:renderer:spending')

export const getCachedTransactions = (() => {
  const cachedTxs = cache.transactions.toArray()

  return async (): Promise<Transaction[]> => {
    try {
      return (await cachedTxs).map((tx: ICacheTransaction, index: number) => {
        return new Transaction(undefined, undefined, JSON.parse(tx.json), index)
      })
    } catch (err) {
      console.error(err)
      throw new Error(err)
    }
  }
})()

const titleCase = (str: string) => {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  })
}

const groupTotal = (group: Transaction[]) => {
  return group
    .filter(tx => {
      if (tx.is.metaAction || tx.declined) return false
      return true
    })
    .reduce((sum, tx) => {
      return tx.amount.positive ? sum : sum + Number(tx.amount)
    }, 0)
}

const groupSort = (a: [string, Transaction[]], b: [string, Transaction[]]) => {
  const atot = groupTotal(a[1])
  const btot = groupTotal(b[1])

  return atot - btot
}

const groups = async (months: number) => {
  await getCachedTransactions()

  const cachedTxs = await cache.transactions.toArray()
  const txs = cachedTxs.map((tx: ICacheTransaction, index: number) => {
    return new Transaction(undefined, undefined, tx.json, index)
  })

  const currentMonth = txs.filter(tx => {
    return isSameMonth(tx.created, subMonths(new Date(), months))
  })

  return currentMonth.reduce((groups, tx) => {
    // const groups = txs.reduce((groups, tx) => {
    const groupId = tx.category.raw

    if (groupId in groups) groups[groupId].push(tx)
    else groups[groupId] = [tx]

    return groups
  }, {} as { [groupId: string]: Transaction[] })
}

const groupStats = groups => {
  return Object.entries(groups)
    .sort(groupSort)
    .map(([_, txs]) => txs)
    .map(group => {
      return {
        name: titleCase(group[0].category.formatted),
        spent: new Amount({ amount: groupTotal(group), currency: 'GBP' })
      }
    })
}

const drawGroupStats = async groups => {
  const sum = d3.sum(groups, d => Math.abs(d.spent.raw))

  const WIDTH = 500
  const HEIGHT = 500
  const THICKNESS = 80
  const OUTER_RADIUS = 200
  const INNER_RADIUS = OUTER_RADIUS - THICKNESS
  const MIN_PER = 0.012

  const svg = d3
    .select('.spending-vis svg')
    .attr('width', WIDTH)
    .attr('height', HEIGHT)

  const color = d3.scaleOrdinal(d3.schemeCategory10)
  const arc = d3.arc().outerRadius(OUTER_RADIUS).innerRadius(INNER_RADIUS)
  const pie = d3
    .pie()
    .value(d => {
      const val = Math.abs(d.spent.raw)

      return val / sum > MIN_PER ? val : sum * MIN_PER
    })
    .sort(null)

  const group = svg
    .select('g')
    .attr('transform', `translate(${WIDTH / 2},${HEIGHT / 2})`)

  const label = group
    .select('.label')
    .attr('transform', 'translate(0, -25)')
    .attr('text-anchor', 'middle')
    .attr('font-size', '25px')

  const amount = group
    .select('.amount')
    .attr('transform', 'translate(0, 30)')
    .attr('text-anchor', 'middle')
    .attr('font-size', '40px')

  const gdata = group.selectAll('.arc').data(pie(groups))

  const segment = gdata
    .enter()
    .append('path')
    .each(function(d) {
      this._current = d
    })
    .merge(gdata)
    .attr('d', d => arc(d))
    .attr('fill', (_, i) => color(i))
    .classed('arc', true)

  gdata.transition().duration(400).attrTween('d', function(d) {
    const interpolate = d3.interpolate(this._current, d)

    this._current = interpolate(0)

    return function(time) {
      return arc(interpolate(time))
    }
  })

  segment.on('mouseover', (d, i, segments) => {
    label.html('')
    segments.forEach(segment => {
      segment.classList.remove('active')
    })

    segments[i].classList.add('active')
    label.html(d.data.name)
    amount.html(d.data.spent.format('%y%j%p%n'))
  })
}

document.addEventListener('DOMContentLoaded', async () => {
  debug('compiling spending stats')

  const txs = await getCachedTransactions()

  const longAgo = differenceInCalendarMonths(
    new Date(),
    txs.sort((a, b) => {
      return +a.created - +b.created
    })[0].created
  )

  const $spList = document.querySelector('.spending-list') as HTMLDivElement

  for (let i = 0; i < longAgo; i++) {
    const $spMonth = document.createElement('div')
    $spMonth.classList.add('spending-month')
    $spMonth.dataset.monthdiff = String(i)

    const $mthTitle = document.createElement('h2')
    const $txCount = document.createElement('p')
    const $mthSpending = document.createElement('p')

    $txCount.classList.add('transaction-count')
    $mthSpending.classList.add('month-spending')

    $mthTitle.textContent = format(subMonths(new Date(), i), 'MMM YYYY')

    const txCount = Object.values(await groups(i)).reduce((tot, group) => {
      return tot + group.length
    }, 0)
    $txCount.textContent = `${txCount} transactions`

    const mthSpending = groupStats(await groups(i)).reduce((tot, spent) => {
      return tot + spent.spent.raw
    }, 0)
    $mthSpending.textContent = new Amount({
      amount: mthSpending,
      currency: 'GBP'
    }).format('%y%j%p%n')

    $spMonth.appendChild($mthTitle)
    $spMonth.appendChild($txCount)
    $spMonth.appendChild($mthSpending)

    $spList.appendChild($spMonth)
  }

  const $title = document.querySelector('.spending-vis h1') as HTMLElement
  const $els = Array.from(
    document.querySelectorAll('.spending-month') as NodeListOf<HTMLElement>
  )

  $els.forEach((el: HTMLElement) => {
    el.addEventListener('click', async () => {
      await drawGroupStats(
        groupStats(await groups(Number(el.dataset.monthdiff)))
      )

      $els.forEach($el => {
        $el.classList.remove('active')
      })

      Array.from(
        document.querySelectorAll('.spending-vis svg .arc')
      ).forEach(arc => {
        arc.classList.remove('active')
      })

      el.classList.add('active')

      $title.textContent = format(
        subMonths(new Date(), Number(el.dataset.monthdiff)),
        'MMM YYYY'
      )
    })
  })

  $els[0].click()
})
