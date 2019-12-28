#!/usr/bin/env perl

use strict;
use warnings;

use Data::Dumper;
use List::Util qw(sum);

my $wiredefs = [];
my @wirelocs;
my @overlaps;
my $visited = {};
my $maxlen = 0;

while (my $wireline = <>) {
  chomp $wireline;
  continue unless $wireline;

  my @wiredef = split(',', $wireline);
  push @$wiredefs, \@wiredef;
  $maxlen = @wiredef if @wiredef > $maxlen;
}

for (my $i = 0; $i < $maxlen; $i++) {
  for (my $wireno = 0; $wireno < @$wiredefs; $wireno++) {
    my $w = $wiredefs->[$wireno];
    my $wirecmd = $w->[$i];

    next unless $wirecmd;

    #print "$wireno: $wirecmd\n";

    parse_wire_cmd($wireno, $wirecmd);
  }
}

my $min_dist;
my $min_steps;
foreach my $loc (@overlaps) {
  my $d = manhattan_dist($loc);
  $min_dist = $d if !$min_dist || $d < $min_dist;
  my $s = $loc->[2];
  $min_steps = $s if !$min_steps || $s < $min_steps;
}
print "Done, min distance: $min_dist min steps: $min_steps\n";

sub check_for_overlap {
  my $loc = shift;
  my $bucket = $visited->{$loc->[0]}{$loc->[1]};

  if ((keys %$bucket) >= @$wiredefs) {
    my $total_steps = sum values %$bucket;

    push(@overlaps, [ @$loc, $total_steps ]);

    print "Overlap at " . join(',', @$loc) . " after $total_steps total steps\n";
    return 1;
  }
}

sub move_wire {
  my $wireno = shift;
  my $vec  = shift or die "no vector";
  my $wloc = $wirelocs[$wireno];

  my $nx = $wloc->[0] + $vec->[0];
  my $ny = $wloc->[1] + $vec->[1];
  my $travelled = $wloc->[2] + abs($vec->[0]) + abs($vec->[1]);

  $wirelocs[$wireno] = [$nx, $ny, $travelled];

  $visited->{$nx}{$ny}{$wireno} = $travelled;

  check_for_overlap([$nx, $ny]);
}

sub print_wire {
  my ($wireno, $wloc) = @_;

  print "$wireno: " . join(',', @$wloc) . "\n";
}

sub parse_wire_cmd {
  my $wireno = shift;
  my $wc = shift or die "blank command!";

  $wc =~ /^([LDRU])(\d+)$/;
  my ($d, $l) = ($1, $2);

  my @dvec;
  @dvec = (-1, 0) if $d eq 'L';
  @dvec = (1,  0) if $d eq 'R';
  @dvec = (0, -1) if $d eq 'D';
  @dvec = (0,  1) if $d eq 'U';

  for (; $l > 0; $l--) {
    move_wire($wireno, \@dvec);
    #print_wire($wireno, $wirelocs[$wireno]);
  }
}

sub manhattan_dist {
  my $loc = shift;
  return abs($loc->[0]) + abs($loc->[1]);
}
